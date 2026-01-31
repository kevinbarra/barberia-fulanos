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

import { logActivity } from '@/lib/audit'

// ... (previous imports)

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
    const { data: newService, error: insertError } = await supabase.from('services').insert({
        name,
        price: parseFloat(price),
        duration_min: parseInt(duration),
        category,
        tenant_id: formTenantId || tenantId, // Fallback to validated tenant
        is_active: true
    }).select('id').single()

    if (insertError) return { error: 'Error al crear servicio' }

    // AUDIT LOG
    const { data: { user } } = await supabase.auth.getUser()
    if (user && newService) {
        await logActivity({
            tenantId,
            actorId: user.id,
            action: 'CREATE',
            entity: 'services',
            entityId: newService.id,
            metadata: { name, price, duration, category }
        })
    }

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
    const price = parseFloat(formData.get('price') as string)
    const duration = parseInt(formData.get('duration') as string)
    const category = formData.get('category') as string

    // Fetch OLD values for audit (CRITICAL for price tracking)
    const { data: oldService } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single()

    // SECURITY: Filter by BOTH id AND tenant_id
    const { error: updateError } = await supabase
        .from('services')
        .update({
            name,
            price,
            duration_min: duration,
            category
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (updateError) return { error: 'Error al actualizar' }

    // AUDIT LOG (Track price changes specifically)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && oldService) {
        const changes: Record<string, { old: any, new: any }> = {}
        if (oldService.price !== price) changes.price = { old: oldService.price, new: price }
        if (oldService.name !== name) changes.name = { old: oldService.name, new: name }

        await logActivity({
            tenantId,
            actorId: user.id,
            action: 'UPDATE',
            entity: 'services',
            entityId: id,
            metadata: { changes }
        })
    }

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
        .eq('tenant_id', tenantId)

    if (updateError) return { error: 'Error al cambiar estado' }

    // AUDIT LOG
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await logActivity({
            tenantId,
            actorId: user.id,
            action: 'UPDATE',
            entity: 'services',
            entityId: id,
            metadata: { action: !currentStatus ? 'activado' : 'desactivado' }
        })
    }

    revalidatePath('/admin/services')
    return { success: true, message: currentStatus ? 'Servicio desactivado' : 'Servicio activado' }
}

// --- ELIMINAR SERVICIO (CON SEGURIDAD) ---
export async function deleteService(id: string) {
    const { error, supabase, tenantId } = await validateAdminAccess()
    if (error || !supabase) return { success: false, error }

    // 1. Verificar si tiene uso histórico (dentro del tenant)
    // ... (existing check code) ...
    const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', id)
        .eq('tenant_id', tenantId)

    const { count: transactionsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', id)
        .eq('tenant_id', tenantId)

    if ((bookingsCount || 0) > 0 || (transactionsCount || 0) > 0) {
        return {
            success: false,
            error: 'No se puede eliminar: Este servicio tiene ventas o citas registradas. Mejor desactívalo.'
        }
    }

    // Capture name before delete for log
    const { data: serviceToDelete } = await supabase.from('services').select('name').eq('id', id).single()

    // 2. SECURITY: Delete only if belongs to user's tenant
    const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (deleteError) return { success: false, error: 'Error al eliminar servicio' }

    // AUDIT LOG
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await logActivity({
            tenantId,
            actorId: user.id,
            action: 'DELETE',
            entity: 'services',
            entityId: id,
            metadata: { name: serviceToDelete?.name }
        })
    }

    revalidatePath('/admin/services')
    return { success: true, message: 'Servicio eliminado correctamente' }
}