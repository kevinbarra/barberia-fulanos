'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { addHours, isBefore } from 'date-fns'

export async function cancelMyBooking(bookingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Debes iniciar sesión.' }

    // 1. Obtener la cita para validar reglas
    const { data: booking } = await supabase
        .from('bookings')
        .select('start_time, status')
        .eq('id', bookingId)
        .eq('customer_id', user.id) // Seguridad: Solo sus propias citas
        .single()

    if (!booking) return { error: 'Cita no encontrada.' }

    // 2. Regla de Negocio: No cancelar si faltan menos de 2 horas
    const now = new Date()
    const appointmentTime = new Date(booking.start_time)
    const limitTime = addHours(now, 2) // Ahora + 2 horas

    // Si la cita es ANTES de (Ahora + 2h), ya es muy tarde
    if (isBefore(appointmentTime, limitTime)) {
        return { error: 'No puedes cancelar con menos de 2 horas de anticipación. Por favor llama a la barbería.' }
    }

    // 3. Ejecutar Cancelación (Soft Delete / Status Change)
    const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

    if (error) return { error: 'Error al cancelar.' }

    revalidatePath('/app') // Actualiza el dashboard del cliente
    revalidatePath('/admin/bookings') // Actualiza la agenda del admin

    return { success: true, message: 'Cita cancelada correctamente.' }
}