'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { fromZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/Mexico_City';

// --- 1. HORARIO SEMANAL (SEMANA TIPO) ---
export async function saveSchedule(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autorizado' }

    // 1. Determinar a quién estamos editando
    const targetStaffId = formData.get('target_staff_id') as string || user.id;

    // 2. Verificar Permisos (Si intento editar a otro, debo ser Owner)
    const { data: requester } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (targetStaffId !== user.id && requester?.role !== 'owner') {
        return { error: 'No tienes permiso para editar el horario de otros.' }
    }

    const tenantId = requester?.tenant_id;
    const updates = []
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

    for (const day of days) {
        const isActive = formData.get(`${day}_active`) === 'on'
        const startTime = formData.get(`${day}_start`) as string
        const endTime = formData.get(`${day}_end`) as string

        updates.push({
            staff_id: targetStaffId, // <--- Guardamos para el objetivo, no siempre para 'user.id'
            day,
            is_active: isActive,
            start_time: startTime || '09:00',
            end_time: endTime || '18:00',
            tenant_id: tenantId
        })
    }

    const { error } = await supabase
        .from('staff_schedules')
        .upsert(updates, { onConflict: 'staff_id, day' })

    if (error) {
        console.error('Schedule error:', error)
        return { error: 'Error al guardar horario.' }
    }

    revalidatePath('/admin/schedule')
    return { success: true, message: 'Horario actualizado correctamente.' }
}

// --- 2. BLOQUEOS DE TIEMPO (EXCEPCIONES) ---
export async function addTimeBlock(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const { data: requester } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()

    const date = formData.get('date') as string
    const startTime = formData.get('start_time') as string
    const endTime = formData.get('end_time') as string
    const reason = formData.get('reason') as string
    // Si soy Owner, uso el staff_id del form. Si soy Staff, uso mi ID.
    let targetStaffId = (requester?.role === 'owner' ? formData.get('staff_id') : user.id) as string;

    // Fallback de seguridad
    if (!targetStaffId) targetStaffId = user.id;

    if (!date || !startTime || !endTime) return { error: 'Faltan datos.' }

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

    if (error) return { error: 'Error al crear bloqueo.' }

    revalidatePath('/admin/schedule')
    return { success: true, message: 'Bloqueo agregado.' }
}

export async function deleteTimeBlock(blockId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('time_blocks').delete().eq('id', blockId)
    if (error) return { error: 'Error al eliminar.' }
    revalidatePath('/admin/schedule')
    return { success: true, message: 'Bloqueo eliminado.' }
}