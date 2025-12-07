'use server'

import { createClient } from '@/utils/supabase/server';

// Helper para verificar rol
async function requireAdminOrOwner() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

    if (!profile) throw new Error('Perfil no encontrado');

    // Verificación estricta: Staff no puede ver reportes
    if (profile.role === 'staff') {
        throw new Error('Acceso denegado: Solo administradores pueden ver reportes.');
    }

    return profile;
}

export async function getFinancialDashboard(
    startDate?: string,
    endDate?: string
) {
    const supabase = await createClient();
    const profile = await requireAdminOrOwner();

    const { data, error } = await supabase.rpc('get_financial_dashboard', {
        p_tenant_id: profile.tenant_id,
        p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_end_date: endDate || new Date().toISOString().split('T')[0]
    });

    if (error) throw error;
    return data;
}

export async function getStaffRevenue(month?: string) {
    const supabase = await createClient();
    const profile = await requireAdminOrOwner();

    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const { data, error } = await supabase
        .from('staff_revenue_report')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .gte('month', `${targetMonth}-01`)
        .lt('month', `${targetMonth}-31`)
        .order('total_revenue', { ascending: false });

    if (error) throw error;
    return data;
}

export async function getTopServices(month?: string) {
    const supabase = await createClient();
    const profile = await requireAdminOrOwner();

    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const { data, error } = await supabase
        .from('top_services_report')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .gte('month', `${targetMonth}-01`)
        .lt('month', `${targetMonth}-31`)
        .order('total_revenue', { ascending: false })
        .limit(10);

    if (error) throw error;
    return data;
}

export async function getClientRetentionMetrics() {
    const supabase = await createClient();
    const profile = await requireAdminOrOwner();

    const { data, error } = await supabase
        .from('client_retention_metrics')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('month', { ascending: false })
        .limit(12);

    if (error) throw error;
    return data;
}

export async function getRevenueByWeekday() {
    const supabase = await createClient();
    const profile = await requireAdminOrOwner();

    const { data, error } = await supabase.rpc('get_revenue_by_weekday', {
        p_tenant_id: profile.tenant_id,
        p_months_back: 3
    });

    if (error) throw error;
    return data;
}

export async function getHourlyRevenue() {
    const supabase = await createClient();
    const profile = await requireAdminOrOwner();

    const { data, error } = await supabase.rpc('get_hourly_revenue_heatmap', {
        p_tenant_id: profile.tenant_id,
        p_months_back: 1
    });

    if (error) throw error;
    return data;
}

export async function refreshMetrics() {
    const supabase = await createClient();
    await requireAdminOrOwner(); // Check role

    const { error } = await supabase.rpc('refresh_daily_metrics');

    if (error) throw error;
    return { success: true };
}
