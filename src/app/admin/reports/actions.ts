'use server'

import { createClient, getTenantIdForAdmin } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { headers } from 'next/headers';

// Helper para verificar rol y obtener tenant (soporta super admin)
// Uses admin client to bypass RLS and guarantee profile resolution
// Handles super_admin/owner accounts with NULL tenant_id via dynamic fallback
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

    const userRole = profile?.role || 'customer';
    const isPrivilegedUser = userRole === 'super_admin' || userRole === 'owner' || userRole === 'admin';

    // Verificación estricta: Staff no puede ver reportes
    if (userRole === 'staff') {
        throw new Error('Acceso denegado: Solo administradores pueden ver reportes.');
    }

    // 1. For privileged users on subdomain, resolve tenant from hostname FIRST
    const headersList = await headers();
    const hostname = headersList.get('host') || '';
    const parts = hostname.replace(':443', '').replace(':80', '').split('.');
    const reservedSubdomains = ['www', 'api', 'admin', 'app', 'localhost'];

    if (parts.length >= 3 || hostname.includes('localhost')) {
        const subdomain = parts[0];

        if (!reservedSubdomains.includes(subdomain) && subdomain !== 'localhost') {
            const { data: tenant } = await adminClient
                .from('tenants')
                .select('id')
                .eq('slug', subdomain)
                .single();

            if (tenant?.id) {
                console.log(`[requireAdminOrOwner] Resolved tenant from subdomain: ${subdomain}`);
                return { ...profile, tenant_id: tenant.id };
            }
        }
    }

    // 2. If profile has tenant_id, use it
    if (profile?.tenant_id) {
        return { ...profile, tenant_id: profile.tenant_id };
    }

    // 3. FALLBACK for privileged users with NULL tenant_id: find their owned tenant
    if (isPrivilegedUser && !profile?.tenant_id) {
        console.log(`[requireAdminOrOwner] Privileged user ${user.id} has NULL tenant_id, searching for owned tenant...`);

        // Try to find a tenant owned by this user
        const { data: ownedTenant } = await adminClient
            .from('tenants')
            .select('id, slug')
            .eq('owner_id', user.id)
            .limit(1)
            .single();

        if (ownedTenant?.id) {
            console.log(`[requireAdminOrOwner] Found owned tenant: ${ownedTenant.slug}`);
            return { ...profile, tenant_id: ownedTenant.id };
        }

        // For super_admin without owned tenant, try first active tenant as fallback
        if (userRole === 'super_admin') {
            const { data: anyTenant } = await adminClient
                .from('tenants')
                .select('id, slug')
                .eq('subscription_status', 'active')
                .limit(1)
                .single();

            if (anyTenant?.id) {
                console.log(`[requireAdminOrOwner] Super admin fallback to first active tenant: ${anyTenant.slug}`);
                return { ...profile, tenant_id: anyTenant.id };
            }
        }

        // If still no tenant found
        console.error(`[requireAdminOrOwner] No tenant found for privileged user: ${user.id}`);
        throw new Error('No se encontró ningún negocio asociado. Contacta soporte.');
    }

    // 4. For non-privileged users without tenant_id, this is an error
    console.error(`[requireAdminOrOwner] No tenant_id for non-privileged User ID: ${user.id}`);
    throw new Error('Usuario sin negocio asignado. Contacta soporte.');
}


export async function getFinancialDashboard(
    startDate?: string,
    endDate?: string
) {
    const supabase = await createClient();
    const profile = await requireAdminOrOwner();

    const { data, error } = await supabase.rpc('get_financial_metrics', {
        p_tenant_id: profile.tenant_id,
        p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_end_date: endDate || new Date().toISOString().split('T')[0]
    });

    if (error) throw error;
    return data; // Returns { total_revenue, total_transactions, avg_transaction_value, unique_clients... }
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

    // New RPC signature: p_tenant_id, p_months_back
    const { data, error } = await supabase.rpc('get_revenue_by_weekday', {
        p_tenant_id: profile.tenant_id,
        p_months_back: 3
    });

    if (error) throw error;
    return data;
}

// New function for Daily Breakdown
export async function getRevenueByDay(
    startDate?: string,
    endDate?: string
) {
    const supabase = await createClient();
    const profile = await requireAdminOrOwner();

    const { data, error } = await supabase.rpc('get_revenue_by_day', {
        p_tenant_id: profile.tenant_id,
        p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_end_date: endDate || new Date().toISOString().split('T')[0]
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
