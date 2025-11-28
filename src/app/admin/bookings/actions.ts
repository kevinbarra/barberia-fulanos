'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function processPayment(data: {
    booking_id: string;
    amount: number;
    payment_method: string;
}) {
    const supabase = await createClient()

    // 1. Obtener detalles de la cita para saber tenant y staff
    const { data: booking } = await supabase
        .from('bookings')
        .select('tenant_id, staff_id, service_id')
        .eq('id', data.booking_id)
        .single()

    if (!booking) return { error: 'Cita no encontrada' }

    // 2. Crear la Transacción (Dinero)
    const { error: txError } = await supabase.from('transactions').insert({
        tenant_id: booking.tenant_id,
        staff_id: booking.staff_id,
        service_id: booking.service_id,
        amount: data.amount,
        payment_method: data.payment_method,
        client_id: null, // Anónimo por ahora (Flujo Desacoplado)
        status: 'completed',
        created_at: new Date().toISOString()
    })

    if (txError) {
        console.error('Error creando transacción:', txError)
        return { error: 'No se pudo registrar el cobro' }
    }

    // 3. Actualizar la Cita a "Completada"
    const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', data.booking_id)

    if (bookingError) {
        console.error('Error actualizando cita:', bookingError)
        // No retornamos error fatal porque el dinero ya se cobró, solo falló el status visual
    }

    revalidatePath('/admin/bookings')
    return { success: true }
}