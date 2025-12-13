'use server'

import { createClient, getTenantIdForAdmin } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { headers } from 'next/headers';

// Helper para verificar rol y obtener tenant (soporta super admin)
// Uses admin client to bypass RLS and guarantee profile resolution
async function requireAdminOrOwner() {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('[requireAdminOrOwner] Auth error:', authError);
        throw new Error('No autenticado - sesión inválida');
    }

    // Use ADMIN CLIENT to get profile (bypasses RLS completely)
    const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error(`[requireAdminOrOwner] Profile error for User ID: ${user.id}`, profileError);
        throw new Error(`Perfil no encontrado para User ID: ${user.id}`);
    }

    if (!profile?.tenant_id) {
        console.error(`[requireAdminOrOwner] No tenant_id for User ID: ${user.id}`, profile);
        throw new Error(`Usuario sin tenant asignado: ${user.id}`);
    }

    // Verificación estricta: Staff no puede ver reportes
    if (profile.role === 'staff') {
        throw new Error('Acceso denegado: Solo administradores pueden ver reportes.');
    }

    // Para super admin en subdomain, resolver tenant desde hostname
    if (profile.role === 'super_admin') {
        const headersList = await headers();
        const hostname = headersList.get('host') || '';
        const parts = hostname.replace(':443', '').replace(':80', '').split('.');

        if (parts.length >= 3) {
            const subdomain = parts[0];
            const reservedSubdomains = ['www', 'api', 'admin', 'app'];

            if (!reservedSubdomains.includes(subdomain)) {
                const { data: tenant } = await adminClient
                    .from('tenants')
                    .select('id')
                    .eq('slug', subdomain)
                    .single();

                if (tenant?.id) {
                    console.log(`[requireAdminOrOwner] Super admin resolved to tenant: ${subdomain}`);
                    return { ...profile, tenant_id: tenant.id };
                }
            }
        }
    }

    return { ...profile, tenant_id: profile.tenant_id };
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
