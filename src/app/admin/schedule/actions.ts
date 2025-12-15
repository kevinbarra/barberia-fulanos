'use server'

import { createClient, getTenantIdForAdmin } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { fromZonedTime } from 'date-fns-tz'
import { DEFAULT_TIMEZONE } from '@/lib/constants'

const TIMEZONE = DEFAULT_TIMEZONE;

// --- 1. HORARIO SEMANAL ---
export async function saveSchedule(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autorizado' }

    // 1. Determinar OBJETIVO (A quién editamos)
    const formTargetId = formData.get('target_staff_id') as string | null;

    // Obtener perfil del que solicita (Requester)
    const { data: requester } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    // Regla de Seguridad:
    // - Si soy Owner o Super Admin, puedo editar a quien quiera (formTargetId).
    // - Si soy Staff, SOLO puedo editarme a mí mismo (user.id), ignoro el form.
    const isManager = requester?.role === 'owner' || requester?.role === 'super_admin';

    // FIX: Check for truthy value AND non-empty string
    const hasValidTargetId = formTargetId && formTargetId.trim().length > 0;
    const targetStaffId = isManager && hasValidTargetId ? formTargetId : user.id;

    console.log('[SCHEDULE] Save request:', {
        requesterId: user.id,
        isManager,
        formTargetId,
        finalTargetId: targetStaffId,
        role: requester?.role
    });

    // Use getTenantIdForAdmin for super admin support
    const tenantId = await getTenantIdForAdmin();

    if (!tenantId) return { error: 'Error de configuración de cuenta.' }

    const updates = []
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

    for (const day of days) {
        const isActive = formData.get(`${day}_active`) === 'on'
        const startTime = formData.get(`${day}_start`) as string
        const endTime = formData.get(`${day}_end`) as string

        updates.push({
            staff_id: targetStaffId, // <--- ID VALIDADO
            day,
            is_active: isActive,
            start_time: startTime || '09:00',
            end_time: endTime || '18:00',
            tenant_id: tenantId
        })
    }

    // Upsert atómico basado en el índice único que acabamos de crear en SQL
    const { error } = await supabase
        .from('staff_schedules')
        .upsert(updates, { onConflict: 'staff_id, day' })

    if (error) {
        console.error('Schedule Save Error:', error, { targetStaffId, tenantId, role: requester?.role })
        return { error: `Error al guardar horario: ${error.message}` }
    }

    revalidatePath('/admin/schedule')
    return { success: true, message: 'Horario actualizado correctamente.' }
}

// --- 2. BLOQUEOS DE TIEMPO ---
export async function addTimeBlock(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const { data: requester } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()

    const date = formData.get('date') as string
    const startTime = formData.get('start_time') as string
    const endTime = formData.get('end_time') as string
    const reason = formData.get('reason') as string

    // Misma lógica de seguridad para bloqueos
    const isManager = requester?.role === 'owner' || requester?.role === 'super_admin';
    let targetStaffId = (isManager ? formData.get('staff_id') : user.id) as string;
    if (!targetStaffId) targetStaffId = user.id;

    if (!date || !startTime || !endTime) return { error: 'Faltan datos.' }

    // Conversión de Zona Horaria
    const startISO = fromZonedTime(`${date} ${startTime}:00`, TIMEZONE).toISOString()
    const endISO = fromZonedTime(`${date} ${endTime}:00`, TIMEZONE).toISOString()

    if (endISO <= startISO) return { error: 'Hora fin inválida.' }

    const { error } = await supabase
        .from('time_blocks')
        .insert({
            tenant_id: requester?.tenant_id,
            staff_id: targetStaffId,
            start_time: startISO,
            end_time: endISO,
            reason: reason || 'No disponible'
        })

    if (error) {
        console.error(error)
        return { error: 'Error al crear bloqueo.' }
    }

    revalidatePath('/admin/schedule')
    return { success: true, message: 'Bloqueo agregado.' }
}

export async function deleteTimeBlock(blockId: string) {
    const supabase = await createClient()

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // 2. Role + Tenant Check
    const { data: requester } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    if (!requester || !['owner', 'super_admin', 'staff'].includes(requester.role)) {
        return { error: 'Permisos insuficientes' }
    }

    // For super_admin, get tenant from context
    const tenantId = requester.role === 'super_admin'
        ? await getTenantIdForAdmin()
        : requester.tenant_id

    if (!tenantId) return { error: 'Tenant no encontrado' }

    // 3. SECURITY: Delete only if block belongs to user's tenant
    const { error } = await supabase
        .from('time_blocks')
        .delete()
        .eq('id', blockId)
        .eq('tenant_id', tenantId) // TENANT ISOLATION

    if (error) return { error: 'Error al eliminar.' }

    revalidatePath('/admin/schedule')
    return { success: true, message: 'Bloqueo eliminado.' }
}