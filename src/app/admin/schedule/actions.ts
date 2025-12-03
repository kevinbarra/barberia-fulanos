'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- 1. HORARIO SEMANAL (RECURRENTE) ---
export async function saveSchedule(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autorizado' }

    const updates = []
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

    // Procesamos cada día del formulario
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
            tenant_id: (await getTenantId(supabase, user.id))
        })
    }

    // Upsert masivo (Insertar o Actualizar)
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

// --- 2. BLOQUEOS DE TIEMPO (EXCEPCIONES) ---
export async function addTimeBlock(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autorizado' }

    const date = formData.get('date') as string
    const startTime = formData.get('start_time') as string
    const endTime = formData.get('end_time') as string
    const reason = formData.get('reason') as string

    if (!date || !startTime || !endTime) {
        return { error: 'Faltan datos.' }
    }

    // Convertir a ISO timestamps con zona horaria correcta es complejo en servidor puro.
    // Para simplificar MVP, guardaremos asumiendo la fecha local del input.
    // "2024-05-20" + "T" + "10:00" + ":00"
    const startISO = `${date}T${startTime}:00`
    const endISO = `${date}T${endTime}:00`

    // Validación básica
    if (endISO <= startISO) return { error: 'La hora fin debe ser mayor al inicio.' }

    const tenantId = await getTenantId(supabase, user.id)

    const { error } = await supabase
        .from('time_blocks')
        .insert({
            tenant_id: tenantId,
            staff_id: user.id, // El bloqueo es personal
            start_time: new Date(startISO).toISOString(), // Guardamos en UTC estándar
            end_time: new Date(endISO).toISOString(),
            reason: reason || 'No disponible'
        })

    if (error) {
        console.error('Block error:', error)
        return { error: 'Error al crear bloqueo.' }
    }

    revalidatePath('/admin/schedule')
    return { success: true, message: 'Bloqueo agregado.' }
}

export async function deleteTimeBlock(blockId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('time_blocks')
        .delete()
        .eq('id', blockId)

    if (error) return { error: 'Error al eliminar.' }

    revalidatePath('/admin/schedule')
    return { success: true, message: 'Bloqueo eliminado.' }
}

// Helper interno para obtener tenant
async function getTenantId(supabase: any, userId: string) {
    const { data } = await supabase.from('profiles').select('tenant_id').eq('id', userId).single()
    return data?.tenant_id
}