'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- ACCIÓN 1: CHECK-IN (Abrir Ticket / Bloquear Horario) ---
export async function createTicket(data: {
    tenantId: string
    staffId: string
    clientName: string
    duration: number
}) {
    const supabase = await createClient()

    // Calculamos la hora de fin basada en la duración seleccionada
    const now = new Date()
    const endTime = new Date(now.getTime() + data.duration * 60000)

    // Creamos la cita en estado 'seated' (En silla)
    // service_id va NULL porque aún no sabemos qué se hizo realmente
    const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
            tenant_id: data.tenantId,
            staff_id: data.staffId,
            service_id: null,
            start_time: now.toISOString(),
            end_time: endTime.toISOString(),
            status: 'seated',
            notes: `Walk-in: ${data.clientName}`,
            customer_id: null
        })
        .select('id')
        .single()

    if (error) {
        console.error('Check-in error:', error)
        return { success: false, error: 'No se pudo abrir el ticket.' }
    }

    revalidatePath('/admin/pos')
    return { success: true, message: 'Ticket abierto.', bookingId: booking.id }
}

// --- ACCIÓN 2: CHECKOUT (Cerrar Venta y Registrar Dinero) ---
export async function finalizeTicket(data: {
    bookingId: string
    serviceId: string
    paymentMethod: string
    amount: number
    tenantId: string
}) {
    const supabase = await createClient()

    // 1. Obtener datos de la cita original (para saber quién atendió)
    const { data: booking } = await supabase
        .from('bookings')
        .select('staff_id, customer_id')
        .eq('id', data.bookingId)
        .single()

    if (!booking) {
        return { success: false, error: 'Ticket no encontrado.' }
    }

    // 2. Calcular Puntos (10%)
    const points = Math.floor(data.amount * 0.10)

    // 3. Crear la Transacción (El registro del dinero)
    const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
            tenant_id: data.tenantId,
            staff_id: booking.staff_id,
            service_id: data.serviceId, // Guardamos el servicio real seleccionado al final
            amount: data.amount,
            payment_method: data.paymentMethod,
            status: 'completed',
            created_at: new Date().toISOString(),
            points_earned: points,
            client_id: booking.customer_id
        })
        .select('id')
        .single()

    if (txError) {
        console.error('Tx Error:', txError)
        return { success: false, error: 'Error al registrar pago.' }
    }

    // 4. Cerrar la Cita y actualizar el servicio realizado
    const { error: updateError } = await supabase
        .from('bookings')
        .update({
            status: 'completed',
            service_id: data.serviceId
        })
        .eq('id', data.bookingId)

    if (updateError) {
        console.error('Update Booking Error:', updateError)
        // Retornamos éxito parcial porque el dinero ya se cobró
        return { success: true, transactionId: transaction.id, points, message: 'Cobrado (Error al cerrar cita)' }
    }

    revalidatePath('/admin/pos')
    return { success: true, transactionId: transaction.id, points, message: 'Cobro exitoso' }
}

// --- ACCIÓN 3: ANULAR (Soft Delete / Auditoría) ---
export async function voidTicket(bookingId: string) {
    const supabase = await createClient()

    // Cambiamos estado a 'cancelled' en lugar de borrar.
    // Esto permite al dueño ver quién canceló citas en la base de datos.
    const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

    if (error) {
        console.error('Void error:', error)
        return { success: false, error: 'Error al anular.' }
    }

    revalidatePath('/admin/pos')
    return { success: true, message: 'Ticket anulado.' }
}