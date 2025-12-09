'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { broadcastBookingEvent } from '@/lib/broadcast'
// import { addHours, isBefore } from 'date-fns' // Desactivado para pruebas

export async function cancelMyBooking(bookingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Debes iniciar sesión.' }

    // 1. Obtener la cita para validar que sea suya y obtener datos para broadcast
    const { data: booking } = await supabase
        .from('bookings')
        .select(`
            start_time, status, tenant_id,
            services:service_id(name),
            profiles:staff_id(full_name)
        `)
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

    // 4. Broadcast para actualización en tiempo real
    if (booking.tenant_id) {
        const service = Array.isArray(booking.services) ? booking.services[0] : booking.services
        const staff = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles

        await broadcastBookingEvent(booking.tenant_id, 'booking-cancelled', {
            id: bookingId,
            serviceName: service?.name || 'Servicio',
            staffName: staff?.full_name || 'Staff',
            status: 'cancelled'
        })
    }

    revalidatePath('/app')
    revalidatePath('/admin/bookings')
    revalidatePath('/admin/pos')

    return { success: true, message: 'Cita cancelada correctamente.' }
}