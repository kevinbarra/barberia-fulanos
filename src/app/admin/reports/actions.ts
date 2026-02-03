'use server'

import { createClient } from '@/utils/supabase/server';
// import { redirect } from 'next/navigation'; // Not strictly used in the functions below, but good to have if needed for auth checks later. 
// User provided code imports it, so I will include it.

// Helper para obtener y validar el tenant del usuario actual de forma segura
async function getMyTenantId() {
    const supabase = await createClient();

    // 1. Obtener sesión del usuario (Autenticación)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('[Reports] Auth Error: No session found.');
        throw new Error('Sesión expirada o inválida.');
    }

    // 2. Obtener tenant_id del perfil (Autorización simple)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.tenant_id) {
        console.error('[Reports] Profile Error: No tenant_id for user', user.id);
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
        return data;
    } catch (error) {
        console.error('[Reports] Critical Error in Dashboard:', error);
        // Retornamos null para que el Frontend maneje el estado vacío elegantemente
        return null;
    }
}

export async function getRevenueByWeekday() {
    try {
        const supabase = await createClient();
        const tenantId = await getMyTenantId();

        const { data, error } = await supabase.rpc('get_revenue_by_weekday', {
            p_tenant_id: tenantId,
            p_months_back: 3
        });

        if (error) throw error;
        return data;
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

export async function getHourlyRevenue() {
    try {
        const supabase = await createClient();
        const tenantId = await getMyTenantId();

        const { data, error } = await supabase.rpc('get_hourly_revenue_heatmap', {
            p_tenant_id: tenantId,
            p_months_back: 1
        });

        if (error) throw error;
        return data;
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
