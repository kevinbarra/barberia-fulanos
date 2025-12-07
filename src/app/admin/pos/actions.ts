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
// --- ACCIÓN 2: CHECKOUT (Cerrar Venta y Registrar Dinero) ---
export async function finalizeTicket({
    bookingId,
    amount,
    serviceId,
    paymentMethod,
    tenantId,
    pointsRedeemed = 0,
    rewardId = null
}: {
    bookingId: string;
    amount: number;
    serviceId: string;
    paymentMethod: string;
    tenantId: string;
    pointsRedeemed?: number;
    rewardId?: string | null;
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
            p_client_id: booking.customer_id,
            p_total: amount,
            p_services: [{ id: serviceId, price: amount }],
            p_products: [],
            p_payment_method: paymentMethod,
            p_barber_id: booking.staff_id,
            p_points_redeemed: pointsRedeemed,
            p_reward_id: rewardId
        });

        if (txError) throw txError;

        // 6. Cerrar la Cita y actualizar el servicio realizado
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                status: 'completed',
                service_id: serviceId,
                updated_at: new Date().toISOString()
            })
            .eq('id', bookingId)

        if (updateError) {
            console.error('Update Booking Error:', updateError);
            throw updateError; // Importante: lanzar error para que no se complete la transacción
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

    try {
        const { data, error } = await supabase.rpc('get_client_loyalty_points_v2', {
            p_client_id: clientId
        });

        if (error) {
            console.error('Error fetching points (RPC):', error);
            return 0;
        }

        return data || 0;
    } catch (error) {
        console.error('Exception fetching points:', error);
        return 0;
    }
}

// --- ACCIÓN 7: OBTENER ESTADO DE LEALTAD ---
export async function getClientLoyaltyStatus(clientId: string, tenantId: string) {
    const supabase = await createClient();

    try {
        // Obtener puntos actuales y recompensas disponibles
        const { data: rewards, error } = await supabase.rpc('get_available_rewards', {
            p_client_id: clientId,
            p_tenant_id: tenantId
        });

        if (error) throw error;

        // Obtener puntos actuales usando la función segura
        const points = await getClientPoints(clientId);

        return {
            success: true,
            data: {
                current_points: points,
                available_rewards: rewards || []
            }
        };
    } catch (error: any) {
        console.error('Error getting loyalty status:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener estado de lealtad'
        };
    }
}

// --- ACCIÓN 8: CANJEAR RECOMPENSA ---
export async function redeemLoyaltyReward(rewardId: string, clientId: string) {
    const supabase = await createClient();

    try {
        // Verificar que la recompensa existe
        const { data: reward } = await supabase
            .from('loyalty_rewards')
            .select('points_required, name')
            .eq('id', rewardId)
            .single();

        if (!reward) {
            throw new Error('Recompensa no encontrada');
        }

        // Obtener puntos del usuario
        const currentPoints = await getClientPoints(clientId);

        if (currentPoints < reward.points_required) {
            throw new Error(`Puntos insuficientes. Necesitas ${reward.points_required} puntos.`);
        }

        return {
            success: true,
            reward: {
                id: rewardId,
                name: reward.name,
                points: reward.points_required
            }
        };
    } catch (error: any) {
        console.error('Error redeeming reward:', error);
        return {
            success: false,
            error: error.message || 'Error al canjear recompensa'
        };
    }
}