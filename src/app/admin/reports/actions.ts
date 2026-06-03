'use server'

import { createClient } from '@/utils/supabase/server';
// import { redirect } from 'next/navigation'; // Not strictly used in the functions below, but good to have if needed for auth checks later. 
// User provided code imports it, so I will include it.

import { headers } from 'next/headers';

// Helper para obtener y validar el tenant del usuario actual de forma segura
// Soporta "Context Switching" dinámico para Super Admins basado en URL
async function getMyTenantId() {
    const supabase = await createClient();

    // 1. Obtener sesión del usuario (Autenticación)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('[Reports] Auth Error: No session found.');
        throw new Error('Sesión expirada o inválida.');
    }

    // 2. Obtener rol y tenant_id base del perfil
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('[Reports] Profile Error: User', user.id);
        throw new Error('Error al cargar perfil de usuario.');
    }

    // 3. Lógica de "God Mode" / Context Switching
    // Si es Super Admin/Owner, intentamos resolver el tenant desde la URL (Subdominio)
    const isPrivileged = ['super_admin', 'dev', 'owner'].includes(profile.role || '');

    if (isPrivileged) {
        try {
            const headersList = await headers();
            const hostname = headersList.get('host') || '';
            // Extraer subdominio (ej: "fulanos" de "fulanos.agendabarber.pro")
            // Ignoramos 'www', 'localhost', etc.
            const parts = hostname.replace(':3000', '').replace(':443', '').replace(':80', '').split('.');

            if (parts.length >= 3 || (hostname.includes('localhost') && parts.length > 0)) {
                const subdomain = parts[0];
                const reserved = ['www', 'api', 'app', 'admin', 'localhost'];

                if (!reserved.includes(subdomain)) {
                    // Buscar tenant por slug
                    const { data: dynamicTenant } = await supabase
                        .from('tenants')
                        .select('id')
                        .eq('slug', subdomain)
                        .single();

                    if (dynamicTenant?.id) {
                        return dynamicTenant.id; // <--- Context Switch Exitoso
                    }
                }
            }
        } catch (e) {
            console.warn('[Reports] Failed to resolve dynamic tenant from URL', e);
            // Fallback al tenant del perfil
        }
    }

    // 4. Fallback: Retornar el tenant asignado en el perfil
    if (!profile?.tenant_id) {
        throw new Error('No se pudo identificar el negocio asociado a tu cuenta.');
    }

    return profile.tenant_id;
}

export async function getFinancialDashboard(startDate?: string, endDate?: string) {
    try {
        const supabase = await createClient();
        const tenantId = await getMyTenantId();

        // Fechas por defecto: Últimos 30 días si no vienen en la URL
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];

        // Llamada RPC (Funciona porque el SQL tiene SECURITY DEFINER y permisos GRANT)
        const { data, error } = await supabase.rpc('get_financial_metrics', {
            p_tenant_id: tenantId,
            p_start_date: start,
            p_end_date: end
        });

        if (error) throw error;
        
        // Data is already correctly shaped by the RPC, but we normalize it
        return {
            ...data,
            total_revenue: Number(data?.total_revenue || 0),
            total_collected: Number(data?.total_collected || 0),
            total_pending: Number(data?.total_pending || 0),
            total_transactions: Number(data?.total_transactions || 0),
            avg_transaction_value: Number(data?.avg_transaction_value || 0),
            unique_clients: Number(data?.unique_clients || 0),
            payment_methods: data?.payment_methods || [],
            growth_rate: Number(data?.growth_rate || 0)
        };
    } catch (error) {
        console.error('[Reports] Critical Error in Dashboard:', error);
        return null;
    }
}

export async function getRevenueByWeekday(startDate?: string, endDate?: string) {
    try {
        const supabase = await createClient();
        const tenantId = await getMyTenantId();

        if (!startDate || !endDate) {
            const { data, error } = await supabase.rpc('get_revenue_by_weekday', {
                p_tenant_id: tenantId,
                p_months_back: 3
            });
            if (error) throw error;
            return data;
        }

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('start_time, price_at_booking, services(price)')
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .gte('start_time', `${startDate}T00:00:00-06:00`)
            .lte('start_time', `${endDate}T23:59:59-06:00`);

        if (error) throw error;

        const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekdayCount: Record<string, number> = {};
        const dateSum: Record<string, number> = {};
        const dateWeekday: Record<string, string> = {};

        (bookings || []).forEach(b => {
            const date = new Date(b.start_time);
            const dateStr = date.toISOString().split('T')[0];
            const weekdayNum = date.getDay();
            const weekdayName = weekdayNames[weekdayNum];

            const price = Number(b.price_at_booking || (b.services as any)?.price || 0);

            if (!dateSum[dateStr]) {
                dateSum[dateStr] = 0;
                dateWeekday[dateStr] = weekdayName;
            }
            dateSum[dateStr] += price;

            if (!weekdayCount[weekdayName]) {
                weekdayCount[weekdayName] = 0;
            }
            weekdayCount[weekdayName]++;
        });

        const weekdayTotals: Record<string, number> = {};
        const weekdayDaysCount: Record<string, number> = {};
        Object.keys(dateSum).forEach(dateStr => {
            const weekdayName = dateWeekday[dateStr];
            if (!weekdayTotals[weekdayName]) {
                weekdayTotals[weekdayName] = 0;
                weekdayDaysCount[weekdayName] = 0;
            }
            weekdayTotals[weekdayName] += dateSum[dateStr];
            weekdayDaysCount[weekdayName]++;
        });

        return weekdayNames.map(name => {
            const totalRev = weekdayTotals[name] || 0;
            const daysCount = weekdayDaysCount[name] || 1;
            const avg_revenue = Math.round((totalRev / daysCount) * 100) / 100;
            const total_transactions = weekdayCount[name] || 0;
            return {
                weekday: name,
                avg_revenue,
                total_transactions
            };
        });
    } catch (error) {
        console.error('[Reports] Error fetching weekday revenue:', error);
        return [];
    }
}

export async function getRevenueByDay(startDate?: string, endDate?: string) {
    try {
        const supabase = await createClient();
        const tenantId = await getMyTenantId();

        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];

        const { data, error } = await supabase.rpc('get_revenue_by_day', {
            p_tenant_id: tenantId,
            p_start_date: start,
            p_end_date: end
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('[Reports] Error fetching daily revenue:', error);
        return [];
    }
}

export async function getHourlyRevenue(startDate?: string, endDate?: string) {
    try {
        const supabase = await createClient();
        const tenantId = await getMyTenantId();

        if (!startDate || !endDate) {
            const { data, error } = await supabase.rpc('get_hourly_revenue_heatmap', {
                p_tenant_id: tenantId,
                p_months_back: 1
            });
            if (error) throw error;
            return data;
        }

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('start_time, price_at_booking, services(price)')
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .gte('start_time', `${startDate}T00:00:00-06:00`)
            .lte('start_time', `${endDate}T23:59:59-06:00`);

        if (error) throw error;

        const hourlyMap: Record<number, { totalRevenue: number; count: number }> = {};
        for (let h = 0; h < 24; h++) {
            hourlyMap[h] = { totalRevenue: 0, count: 0 };
        }

        (bookings || []).forEach(b => {
            const date = new Date(b.start_time);
            const hour = date.getHours(); // Local hour
            const price = Number(b.price_at_booking || (b.services as any)?.price || 0);
            
            hourlyMap[hour].totalRevenue += price;
            hourlyMap[hour].count++;
        });

        const uniqueDays = new Set((bookings || []).map(b => b.start_time.split('T')[0])).size || 1;

        return Object.keys(hourlyMap).map(hKey => {
            const hour = Number(hKey);
            const data = hourlyMap[hour];
            return {
                hour,
                avg_revenue: Math.round((data.totalRevenue / uniqueDays) * 100) / 100,
                transaction_count: data.count
            };
        });
    } catch (error) {
        console.error('[Reports] Error fetching hourly revenue:', error);
        return [];
    }
}

export async function getClientRetentionMetrics() {
    try {
        const supabase = await createClient();
        const tenantId = await getMyTenantId();

        const { data, error } = await supabase
            .from('client_retention_metrics')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('month', { ascending: false })
            .limit(12);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('[Reports] Error fetching retention:', error);
        return [];
    }
}

// Keep the other exports if needed, or remove them if not used by the new page.
// The user instruction implies replacing EVERYTHING.
// However, `getStaffRevenue` and `getTopServices` were in the previous file.
// If I remove them, I might break other components?
// The user provided code DOES NOT include `getStaffRevenue` or `getTopServices`.
// But `AnalyticsDashboard` (Step 1805) uses `useAnalyticsData` which fetches them from `expenses/actions`.
// Wait. `useAnalyticsData` imports from `@/app/admin/expenses/actions`.
// So `getStaffRevenue` in `reports/actions.ts` might be UNUSED?
// Let's check `src/app/admin/reports/actions.ts` exports.
// `getStaffRevenue` and `getTopServices` were exported there.
// BUT `useAnalyticsData` (Step 1817) imports them from `expenses/actions`.
// So removing them from `reports/actions.ts` is likely safe IF they were duplicate or unused.
// I will blindly follow the user instruction to "Reemplaza TODO el contenido".
