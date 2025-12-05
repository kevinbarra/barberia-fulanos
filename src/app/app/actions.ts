'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
// import { addHours, isBefore } from 'date-fns' // Desactivado para pruebas

export async function cancelMyBooking(bookingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Debes iniciar sesión.' }

    // 1. Obtener la cita para validar que sea suya
    const { data: booking } = await supabase
        .from('bookings')
        .select('start_time, status')
        .eq('id', bookingId)
        .eq('customer_id', user.id) // Seguridad: Solo sus propias citas
        .single()

    if (!booking) return { error: 'Cita no encontrada.' }

    // 2. VALIDACIÓN DE TIEMPO (DESACTIVADA PARA QA)
    /*
    const now = new Date()
    const appointmentTime = new Date(booking.start_time)
    const limitTime = addHours(now, 2)

    if (isBefore(appointmentTime, limitTime)) {
        return { error: 'No puedes cancelar con menos de 2 horas de anticipación.' }
    }
    */

    // 3. Ejecutar Cancelación
    const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

    if (error) return { error: 'Error al cancelar.' }

    revalidatePath('/app')
    revalidatePath('/admin/bookings')

    return { success: true, message: 'Cita cancelada correctamente.' }
}