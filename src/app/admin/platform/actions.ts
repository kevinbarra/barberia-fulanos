'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTenant(formData: FormData) {
    const supabase = await createClient();

    // 1. Validar Super Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'super_admin') {
        return { error: 'Permisos insuficientes. Solo Super Admin.' };
    }

    // 2. Obtener datos
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const ownerEmail = formData.get('owner_email') as string;

    if (!name || !slug || !ownerEmail) {
        return { error: 'Todos los campos son requeridos.' };
    }

    // 3. Crear Tenant
    const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
            name,
            slug: slug.toLowerCase().trim().replace(/\s+/g, '-'),
            subscription_status: 'active'
        })
        .select()
        .single();

    if (tenantError) {
        if (tenantError.code === '23505') return { error: 'El slug ya existe.' };
        return { error: 'Error al crear el negocio (Tenant).' };
    }

    // 4. Provisionar Owner
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', ownerEmail)
        .single();

    if (existingProfile) {
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                tenant_id: newTenant.id,
                role: 'owner'
            })
            .eq('id', existingProfile.id);

        if (updateError) {
            return { success: true, message: `Negocio creado, pero error al asignar dueño: ${updateError.message}` };
        }
    } else {
        return {
            success: true,
            message: 'Negocio creado. El usuario deberá registrarse con ese email para ser vinculado.'
        };
    }

    revalidatePath('/admin/platform');
    return { success: true, message: 'Negocio y Dueño configurados exitosamente.' };
}

// Toggle tenant status (suspend/activate)
export async function toggleTenantStatus(tenantId: string, newStatus: 'active' | 'suspended') {
    const supabase = await createClient();

    // Validate Super Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'super_admin') {
        return { error: 'Permisos insuficientes. Solo Super Admin.' };
    }

    const { error } = await supabase
        .from('tenants')
        .update({ subscription_status: newStatus })
        .eq('id', tenantId);

    if (error) {
        return { error: `Error al cambiar status: ${error.message}` };
    }

    revalidatePath('/admin/platform');
    return { success: true, message: `Tenant ${newStatus === 'active' ? 'activado' : 'suspendido'} exitosamente.` };
}

// Get platform-wide stats
export async function getPlatformStats() {
    const supabase = await createClient();

    // Total tenants
    const { count: totalTenants } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });

    // Active tenants
    const { count: activeTenants } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active');

    // Total bookings this month (all tenants)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthlyBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

    // Total revenue this month (all tenants)
    const { data: revenueData } = await supabase
        .from('transactions')
        .select('total')
        .gte('created_at', startOfMonth.toISOString());

    const monthlyRevenue = revenueData?.reduce((sum, t) => sum + (t.total || 0), 0) || 0;

    return {
        totalTenants: totalTenants || 0,
        activeTenants: activeTenants || 0,
        monthlyBookings: monthlyBookings || 0,
        monthlyRevenue
    };
}
