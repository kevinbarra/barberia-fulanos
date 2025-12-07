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
export async function finalizeTicket({
    bookingId,
    amount,
    serviceId,
    paymentMethod,
    tenantId,
    pointsRedeemed = 0
}: {
    bookingId: string;
    amount: number;
    serviceId: string;
    paymentMethod: string;
    tenantId: string;
    pointsRedeemed?: number;
}) {
    const supabase = await createClient()

    // 1. Obtener datos de la cita original (para saber quién atendió)
    const { data: booking } = await supabase
        .from('bookings')
        .select('staff_id, customer_id')
        .eq('id', bookingId)
        .single()

    if (!booking) {
        return { success: false, error: 'Ticket no encontrado.' }
    }

    try {
        // Usar la función RPC que maneja puntos
        const { data: transactionId, error: txError } = await supabase.rpc('create_transaction_with_points', {
            p_client_id: booking.customer_id, // Mapeado de booking.customer_id
            p_total: amount,
            p_services: [{ id: serviceId, price: amount }],
            p_products: [],
            p_payment_method: paymentMethod,
            p_barber_id: booking.staff_id, // Mapeado de booking.staff_id
            p_points_redeemed: pointsRedeemed
        });

        if (txError) throw txError;

        // 6. Cerrar la Cita y actualizar el servicio realizado
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                status: 'completed',
                service_id: serviceId
            })
            .eq('id', bookingId)

        if (updateError) {
            console.error('Update Booking Error:', updateError)
        }

        // Revalidar rutas para actualizar datos
        revalidatePath('/admin/pos');
        revalidatePath('/app');
        revalidatePath('/admin/schedule');

        return { success: true, transactionId: transactionId, points: 0, message: 'Cobro exitoso' }

    } catch (error: any) {
        console.error('Finalize Ticket Error:', error)
        return { success: false, error: error.message || 'Error al procesar el cobro.' }
    }
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
export async function getClientPoints(clientId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('profiles')  // CAMBIO: usar profiles en vez de clients
        .select('loyalty_points')
        .eq('id', clientId)
        .single();

    if (error) {
        console.error('Error fetching points:', error);
        return 0;
    }
    return data?.loyalty_points || 0;  // CAMBIO: usar loyalty_points y default 0
}