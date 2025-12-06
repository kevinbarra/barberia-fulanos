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

    // Validación: 1 barbero = 1 cliente a la vez
    const { count: activeTickets } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', data.staffId)
        .eq('status', 'seated')

    if (activeTickets && activeTickets > 0) {
        return {
            success: false,
            error: 'Este barbero ya tiene un cliente en silla.'
        }
    }

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
    pointsRedeemed?: number
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

    // 2. Si hay puntos a redimir, validar y descontar
    let finalAmount = data.amount
    const pointsRedeemed = data.pointsRedeemed || 0

    if (pointsRedeemed > 0 && booking.customer_id) {
        // Obtener puntos actuales del cliente
        const { data: customer } = await supabase
            .from('profiles')
            .select('loyalty_points')
            .eq('id', booking.customer_id)
            .single()

        if (!customer || (customer.loyalty_points || 0) < pointsRedeemed) {
            return { success: false, error: 'Puntos insuficientes.' }
        }

        // Calcular descuento (100 puntos = $10 MXN)
        const discount = (pointsRedeemed / 100) * 10
        finalAmount = Math.max(0, data.amount - discount)

        // Descontar puntos del cliente
        const { error: updatePointsError } = await supabase
            .from('profiles')
            .update({ loyalty_points: customer.loyalty_points - pointsRedeemed })
            .eq('id', booking.customer_id)

        if (updatePointsError) {
            console.error('Error updating points:', updatePointsError)
            return { success: false, error: 'Error al redimir puntos.' }
        }
    }

    // 3. Calcular Puntos Ganados (10% del monto final pagado)
    const pointsEarned = Math.floor(finalAmount * 0.10)

    // 4. Crear la Transacción (El registro del dinero)
    const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
            tenant_id: data.tenantId,
            staff_id: booking.staff_id,
            service_id: data.serviceId,
            amount: finalAmount,
            payment_method: data.paymentMethod,
            status: 'completed',
            created_at: new Date().toISOString(),
            points_earned: pointsEarned,
            points_redeemed: pointsRedeemed,
            client_id: booking.customer_id
        })
        .select('id')
        .single()

    if (txError) {
        console.error('Tx Error:', txError)
        return { success: false, error: 'Error al registrar pago.' }
    }

    // 5. Sumar puntos ganados al cliente (si está registrado)
    if (booking.customer_id && pointsEarned > 0) {
        const { error: addPointsError } = await supabase.rpc('add_loyalty_points', {
            user_id: booking.customer_id,
            points: pointsEarned
        })

        if (addPointsError) {
            console.error('Error adding loyalty points:', addPointsError)
            // No retornamos error, la transacción ya se creó
        }
    }

    // 6. Cerrar la Cita y actualizar el servicio realizado
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
        return { success: true, transactionId: transaction.id, points: pointsEarned, message: 'Cobrado (Error al cerrar cita)' }
    }

    revalidatePath('/admin/pos')
    return { success: true, transactionId: transaction.id, points: pointsEarned, message: 'Cobro exitoso' }
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

// --- ACCIÓN 4: SENTAR RESERVA WEB (Convertir reserva a ticket activo) ---
export async function seatBooking(bookingId: string) {
    const supabase = await createClient()

    // 1. Obtener la reserva
    const { data: booking } = await supabase
        .from('bookings')
        .select('staff_id, status')
        .eq('id', bookingId)
        .single()

    if (!booking) {
        return { success: false, error: 'Reserva no encontrada.' }
    }

    if (booking.status !== 'confirmed') {
        return { success: false, error: 'Esta reserva ya fue procesada.' }
    }

    // 2. Validar que el barbero no tenga otro cliente en silla
    const { count: activeTickets } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', booking.staff_id)
        .eq('status', 'seated')

    if (activeTickets && activeTickets > 0) {
        return {
            success: false,
            error: 'Este barbero ya tiene un cliente en silla. Finaliza el servicio actual primero.'
        }
    }

    // 3. Cambiar estado a seated
    const { error } = await supabase
        .from('bookings')
        .update({
            status: 'seated',
            start_time: new Date().toISOString() // Actualizar hora real de inicio
        })
        .eq('id', bookingId)

    if (error) {
        console.error('Seat booking error:', error)
        return { success: false, error: 'Error al procesar la reserva.' }
    }

    revalidatePath('/admin/pos')
    revalidatePath('/admin/bookings')
    return { success: true, message: 'Cliente sentado. Listo para atender.' }
}

// --- ACCIÓN 5: CREAR TRANSACCIÓN CON PUNTOS ---
export async function createTransactionWithPoints(formData: {
    clientId: string;
    total: number;
    services: any[];
    products: any[];
    paymentMethod: string;
    barberId: string;
    pointsRedeemed?: number;
}) {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase.rpc('create_transaction_with_points', {
            p_client_id: formData.clientId,
            p_total: formData.total,
            p_services: formData.services,
            p_products: formData.products,
            p_payment_method: formData.paymentMethod,
            p_barber_id: formData.barberId,
            p_points_redeemed: formData.pointsRedeemed || 0
        });

        if (error) throw error;

        revalidatePath('/admin/pos');
        revalidatePath('/app');

        return { success: true, transactionId: data };
    } catch (error: any) {
        console.error('Error creating transaction:', error);
        return {
            success: false,
            error: error.message || 'Error al procesar la transacción'
        };
    }
}

// --- ACCIÓN 6: OBTENER PUNTOS DEL CLIENTE ---
export async function getClientPoints(clientId: string): Promise<number> {
    if (!clientId) {
        console.log('getClientPoints: No clientId provided');
        return 0;
    }

    try {
        const supabase = await createClient();

        console.log('getClientPoints: Fetching points for:', clientId);

        const { data, error } = await supabase
            .from('profiles')
            .select('loyalty_points')
            .eq('id', clientId)
            .single();

        if (error) {
            console.error('getClientPoints error:', error);
            return 0;
        }

        console.log('getClientPoints result:', data);
        return data?.loyalty_points || 0;
    } catch (error) {
        console.error('getClientPoints exception:', error);
        return 0;
    }
}