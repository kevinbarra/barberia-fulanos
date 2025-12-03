'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { fromZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/Mexico_City';

// --- 1. HORARIO SEMANAL ---
export async function saveSchedule(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autorizado' }

    // Helper interno para obtener tenant
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    const tenantId = profile?.tenant_id

    const updates = []
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

    for (const day of days) {
        const isActive = formData.get(`${day}_active`) === 'on'
        const startTime = formData.get(`${day}_start`) as string
        const endTime = formData.get(`${day}_end`) as string

        updates.push({
            staff_id: user.id,
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
    return { success: true, message: 'Horario semanal guardado.' }
}

// --- 2. BLOQUEOS DE TIEMPO (CORREGIDO) ---
export async function addTimeBlock(formData: FormData) {
    const supabase = await createClient()

    // 1. Auth & Permisos
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const { data: requester } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    if (!requester) return { error: 'Perfil no encontrado' }

    // 2. Datos del Formulario
    const date = formData.get('date') as string
    const startTime = formData.get('start_time') as string
    const endTime = formData.get('end_time') as string
    const reason = formData.get('reason') as string
    let targetStaffId = formData.get('staff_id') as string // El ID del barbero a bloquear

    if (!date || !startTime || !endTime) return { error: 'Faltan datos.' }

    // 3. Lógica de Seguridad (Owner vs Staff)
    if (requester.role === 'owner') {
        // Si es dueño, puede bloquear a quien sea (si no manda ID, se asume a sí mismo)
        targetStaffId = targetStaffId || user.id
    } else {
        // Si es staff, FORZAMOS su propio ID. No puede bloquear a otros.
        targetStaffId = user.id
    }

    // 4. Corrección de Timezone (La magia para que 2pm sea 2pm)
    // Interpretamos "2025-12-04 14:00" como hora CDMX, y obtenemos el UTC real.
    const startISO = fromZonedTime(`${date} ${startTime}:00`, TIMEZONE).toISOString()
    const endISO = fromZonedTime(`${date} ${endTime}:00`, TIMEZONE).toISOString()

    if (endISO <= startISO) return { error: 'La hora fin debe ser mayor al inicio.' }

    // 5. Insertar
    const { error } = await supabase
        .from('time_blocks')
        .insert({
            tenant_id: requester.tenant_id,
            staff_id: targetStaffId,
            start_time: startISO,
            end_time: endISO,
            reason: reason || 'No disponible'
        })

    if (error) {
        console.error('Block error:', error)
        return { error: 'Error al crear bloqueo.' }
    }

    revalidatePath('/admin/schedule')
    return { success: true, message: 'Horario bloqueado correctamente.' }
}

export async function deleteTimeBlock(blockId: string) {
    const supabase = await createClient()

    // RLS se encarga de verificar que sea su bloque o que sea Owner
    const { error } = await supabase
        .from('time_blocks')
        .delete()
        .eq('id', blockId)

    if (error) return { error: 'Error al eliminar.' }

    revalidatePath('/admin/schedule')
    return { success: true, message: 'Bloqueo eliminado.' }
}