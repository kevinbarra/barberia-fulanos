'use server'

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { headers } from 'next/headers';
import { toZonedTime } from 'date-fns-tz';

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
        const adminClient = createAdminClient();
        const tenantId = await getMyTenantId();

        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];

        // 1. Query transactions
        const { data: transactions, error: txError } = await adminClient
            .from('transactions')
            .select('amount, payment_method, booking_id')
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .gte('created_at', `${start}T00:00:00-06:00`)
            .lte('created_at', `${end}T23:59:59-06:00`);

        if (txError) throw txError;

        // 2. Query bookings
        const { data: bookings, error: bkError } = await adminClient
            .from('bookings')
            .select('id, end_time, status, price_at_booking, services(price), customer_id')
            .eq('tenant_id', tenantId)
            .neq('status', 'cancelled')
            .gte('start_time', `${start}T00:00:00-06:00`)
            .lte('start_time', `${end}T23:59:59-06:00`);

        if (bkError) throw bkError;

        const txBookingIds = new Set((transactions || []).map(t => t.booking_id).filter(Boolean));

        let totalRevenue = 0;
        let totalCollected = 0;
        let totalPending = 0;
        let totalTransactions = 0;
        const uniqueClients = new Set<string>();
        const paymentMethodsMap: Record<string, number> = { cash: 0, card: 0, transfer: 0, unregistered: 0 };

        // Process actual completed checkouts from transactions
        (transactions || []).forEach(t => {
            const amount = Number(t.amount) || 0;
            const method = t.payment_method || 'cash';
            totalRevenue += amount;
            totalCollected += amount;
            totalTransactions++;

            if (paymentMethodsMap[method] !== undefined) {
                paymentMethodsMap[method] += amount;
            } else {
                paymentMethodsMap.cash += amount;
            }
        });

        // Process bookings
        const now = new Date();
        (bookings || []).forEach(b => {
            const endTime = new Date(b.end_time);
            const isEffective = b.status === 'completed' || endTime < now;

            if (isEffective) {
                if (b.customer_id) {
                    uniqueClients.add(b.customer_id);
                }

                // If this booking has no transaction recorded, it is unregistered income
                if (!txBookingIds.has(b.id)) {
                    const price = Number(b.price_at_booking || (b.services as any)?.price || 0);
                    totalRevenue += price;
                    totalCollected += price; // Treat as collected under virtual category
                    totalTransactions++;
                    paymentMethodsMap.unregistered += price;
                }
            } else {
                // If it is pending/confirmed in the future, count as pending revenue
                const price = Number(b.price_at_booking || (b.services as any)?.price || 0);
                totalPending += price;
            }
        });

        const avg_transaction_value = totalTransactions > 0 ? ROUND_DECIMAL(totalRevenue / totalTransactions, 2) : 0;

        const payment_methods = [
            { method: 'Efectivo', amount: paymentMethodsMap.cash },
            { method: 'Tarjeta', amount: paymentMethodsMap.card },
            { method: 'Transferencia', amount: paymentMethodsMap.transfer },
            { method: 'No Registrado', amount: paymentMethodsMap.unregistered }
        ].filter(pm => pm.amount > 0);

        return {
            total_revenue: totalRevenue,
            total_collected: totalCollected,
            total_pending: totalPending,
            total_transactions: totalTransactions,
            avg_transaction_value,
            unique_clients: uniqueClients.size,
            payment_methods,
            previous_revenue: 0,
            growth_rate: 0
        };
    } catch (error) {
        console.error('[Reports] Critical Error in Dashboard:', error);
        return null;
    }
}

function ROUND_DECIMAL(val: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
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
            .select('start_time, end_time, status, price_at_booking, services(price)')
            .eq('tenant_id', tenantId)
            .neq('status', 'cancelled')
            .gte('start_time', `${startDate}T00:00:00-06:00`)
            .lte('start_time', `${endDate}T23:59:59-06:00`);

        if (error) throw error;

        const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekdayCount: Record<string, number> = {};
        const dateSum: Record<string, number> = {};
        const dateWeekday: Record<string, string> = {};

        const now = new Date();
        (bookings || []).forEach(b => {
            const endTime = new Date(b.end_time);
            const isEffective = b.status === 'completed' || endTime < now;

            if (!isEffective) return;

            const date = new Date(b.start_time);
            const zoned = toZonedTime(date, 'America/Mexico_City');
            const year = zoned.getFullYear();
            const month = String(zoned.getMonth() + 1).padStart(2, '0');
            const day = String(zoned.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const weekdayNum = zoned.getDay();
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
        const adminClient = createAdminClient();
        const tenantId = await getMyTenantId();

        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];

        // 1. Query transactions
        const { data: transactions, error: txError } = await adminClient
            .from('transactions')
            .select('amount, created_at, booking_id')
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .gte('created_at', `${start}T00:00:00-06:00`)
            .lte('created_at', `${end}T23:59:59-06:00`);

        if (txError) throw txError;

        // 2. Query bookings
        const { data: bookings, error: bkError } = await adminClient
            .from('bookings')
            .select('id, start_time, end_time, status, price_at_booking, services(price)')
            .eq('tenant_id', tenantId)
            .neq('status', 'cancelled')
            .gte('start_time', `${start}T00:00:00-06:00`)
            .lte('start_time', `${end}T23:59:59-06:00`);

        if (bkError) throw bkError;

        const txBookingIds = new Set((transactions || []).map(t => t.booking_id).filter(Boolean));
        const dailyMap: Record<string, { revenue: number; bookings: number }> = {};

        // Helper to format local Mexico City date
        const toLocalDateStr = (dateStr: string) => {
            const zoned = toZonedTime(new Date(dateStr), 'America/Mexico_City');
            const year = zoned.getFullYear();
            const month = String(zoned.getMonth() + 1).padStart(2, '0');
            const day = String(zoned.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Populate days range
        let current = new Date(start);
        const limitDate = new Date(end);
        while (current <= limitDate) {
            const dayStr = current.toISOString().split('T')[0];
            dailyMap[dayStr] = { revenue: 0, bookings: 0 };
            current.setDate(current.getDate() + 1);
        }

        // Process transactions
        (transactions || []).forEach(t => {
            const dayStr = toLocalDateStr(t.created_at);
            const amount = Number(t.amount) || 0;
            if (!dailyMap[dayStr]) {
                dailyMap[dayStr] = { revenue: 0, bookings: 0 };
            }
            dailyMap[dayStr].revenue += amount;
            dailyMap[dayStr].bookings++;
        });

        // Process bookings (unregistered effective bookings)
        const now = new Date();
        (bookings || []).forEach(b => {
            const endTime = new Date(b.end_time);
            const isEffective = b.status === 'completed' || endTime < now;

            if (isEffective && !txBookingIds.has(b.id)) {
                const dayStr = toLocalDateStr(b.start_time);
                const price = Number(b.price_at_booking || (b.services as any)?.price || 0);

                if (!dailyMap[dayStr]) {
                    dailyMap[dayStr] = { revenue: 0, bookings: 0 };
                }
                dailyMap[dayStr].revenue += price;
                dailyMap[dayStr].bookings++;
            }
        });

        return Object.keys(dailyMap)
            .sort()
            .map(day => ({
                day,
                revenue: ROUND_DECIMAL(dailyMap[day].revenue, 2),
                bookings: dailyMap[day].bookings
            }));

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
            .select('start_time, end_time, status, price_at_booking, services(price)')
            .eq('tenant_id', tenantId)
            .neq('status', 'cancelled')
            .gte('start_time', `${startDate}T00:00:00-06:00`)
            .lte('start_time', `${endDate}T23:59:59-06:00`);

        if (error) throw error;

        const hourlyMap: Record<number, { totalRevenue: number; count: number }> = {};
        for (let h = 0; h < 24; h++) {
            hourlyMap[h] = { totalRevenue: 0, count: 0 };
        }

        const now = new Date();
        (bookings || []).forEach(b => {
            const endTime = new Date(b.end_time);
            const isEffective = b.status === 'completed' || endTime < now;

            if (!isEffective) return;

            const date = new Date(b.start_time);
            const zoned = toZonedTime(date, 'America/Mexico_City');
            const hour = zoned.getHours(); // Zoned hour matching owner's timezone
            const price = Number(b.price_at_booking || (b.services as any)?.price || 0);
            
            hourlyMap[hour].totalRevenue += price;
            hourlyMap[hour].count++;
        });

        // Unique days count in range based on zoned representation
        const uniqueZonedDays = new Set((bookings || []).map(b => {
            const zoned = toZonedTime(new Date(b.start_time), 'America/Mexico_City');
            const y = zoned.getFullYear();
            const m = String(zoned.getMonth() + 1).padStart(2, '0');
            const d = String(zoned.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        })).size || 1;

        return Object.keys(hourlyMap).map(hKey => {
            const hour = Number(hKey);
            const data = hourlyMap[hour];
            return {
                hour,
                avg_revenue: Math.round((data.totalRevenue / uniqueZonedDays) * 100) / 100,
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
