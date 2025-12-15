'use server'

import { createClient, getTenantIdForAdmin } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper for auth + role + tenant validation
async function validateAdminAccess() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado', supabase: null, tenantId: null }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile || !['owner', 'super_admin', 'staff'].includes(profile.role)) {
        return { error: 'Permisos insuficientes', supabase: null, tenantId: null }
    }

    // For super_admin, get tenant from context
    const tenantId = profile.role === 'super_admin'
        ? await getTenantIdForAdmin()
        : profile.tenant_id

    if (!tenantId) {
        return { error: 'Tenant no encontrado', supabase: null, tenantId: null }
    }

    return { error: null, supabase, tenantId, role: profile.role }
}

// --- CREAR SERVICIO ---
export async function createService(formData: FormData) {
    const { error, supabase, tenantId } = await validateAdminAccess()
    if (error || !supabase) return { error }

    const name = formData.get('name') as string
    const price = formData.get('price') as string
    const duration = formData.get('duration') as string
    const category = formData.get('category') as string || 'General'
    const formTenantId = formData.get('tenant_id') as string

    // Security: Use validated tenantId, not form input
    const { error: insertError } = await supabase.from('services').insert({
        name,
        price: parseFloat(price),
        duration_min: parseInt(duration),
        category,
        tenant_id: formTenantId || tenantId, // Fallback to validated tenant
        is_active: true
    })

    if (insertError) return { error: 'Error al crear servicio' }

    revalidatePath('/admin/services')
    revalidatePath('/admin/pos')
    revalidatePath('/admin/bookings')
    return { success: true, message: 'Servicio creado' }
}

// --- ACTUALIZAR SERVICIO ---
export async function updateService(formData: FormData) {
    const { error, supabase, tenantId } = await validateAdminAccess()
    if (error || !supabase) return { error }

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const price = formData.get('price') as string
    const duration = formData.get('duration') as string
    const category = formData.get('category') as string

    // SECURITY: Filter by BOTH id AND tenant_id
    const { error: updateError } = await supabase
        .from('services')
        .update({
            name,
            price: parseFloat(price),
            duration_min: parseInt(duration),
            category
        })
        .eq('id', id)
        .eq('tenant_id', tenantId) // TENANT ISOLATION

    if (updateError) return { error: 'Error al actualizar' }

    revalidatePath('/admin/services')
    revalidatePath('/admin/pos')
    revalidatePath('/admin/bookings')
    return { success: true, message: 'Servicio actualizado' }
}

// --- CAMBIAR ESTADO (ACTIVAR/DESACTIVAR) ---
export async function toggleServiceStatus(id: string, currentStatus: boolean) {
    const { error, supabase, tenantId } = await validateAdminAccess()
    if (error || !supabase) return { error }

    // SECURITY: Filter by BOTH id AND tenant_id
    const { error: updateError } = await supabase
        .from('services')
        .update({ is_active: !currentStatus })
        .eq('id', id)
        .eq('tenant_id', tenantId) // TENANT ISOLATION

    if (updateError) return { error: 'Error al cambiar estado' }

    revalidatePath('/admin/services')
    return { success: true, message: currentStatus ? 'Servicio desactivado' : 'Servicio activado' }
}

// --- ELIMINAR SERVICIO (CON SEGURIDAD) ---
export async function deleteService(id: string) {
    const { error, supabase, tenantId } = await validateAdminAccess()
    if (error || !supabase) return { success: false, error }

    // 1. Verificar si tiene uso histórico (dentro del tenant)
    const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', id)
        .eq('tenant_id', tenantId) // TENANT ISOLATION

    const { count: transactionsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', id)
        .eq('tenant_id', tenantId) // TENANT ISOLATION

    if ((bookingsCount || 0) > 0 || (transactionsCount || 0) > 0) {
        return {
            success: false,
            error: 'No se puede eliminar: Este servicio tiene ventas o citas registradas. Mejor desactívalo.'
        }
    }

    // 2. SECURITY: Delete only if belongs to user's tenant
    const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId) // TENANT ISOLATION

    if (deleteError) return { success: false, error: 'Error al eliminar servicio' }

    revalidatePath('/admin/services')
    return { success: true, message: 'Servicio eliminado correctamente' }
}