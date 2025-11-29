'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- FUNCIÓN 1: PROCESAR COBRO (OPTIMIZADA) ---
export async function processPayment(data: {
    booking_id: string;
    amount: number;
    payment_method: string;
}) {
    const supabase = await createClient()

    // 1. Obtener detalles de la cita
    const { data: booking } = await supabase
        .from('bookings')
        .select('tenant_id, staff_id, service_id')
        .eq('id', data.booking_id)
        .single()

    if (!booking) return { error: 'Cita no encontrada' }

    // 2. CALCULAR PUNTOS (Regla de negocio: 10% del valor en puntos)
    // Ejemplo: $250 pesos = 25 puntos.
    const pointsEarned = Math.floor(data.amount * 0.10)

    // 3. Crear la Transacción (Ahora guardamos los puntos latentes)
    const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
            tenant_id: booking.tenant_id,
            staff_id: booking.staff_id,
            service_id: booking.service_id,
            amount: data.amount,
            payment_method: data.payment_method,
            client_id: null, // Se vinculará después con el QR
            points_earned: pointsEarned,
            status: 'completed',
            created_at: new Date().toISOString()
        })
        .select('id') // Importante: Devolver el ID para usarlo en el modal
        .single()

    if (txError || !transaction) {
        console.error('Error creando transacción:', txError)
        return { success: false, error: 'No se pudo registrar el cobro' }
    }

    // 4. Actualizar la Cita a "Completada"
    const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', data.booking_id)

    if (bookingError) {
        console.error('Error actualizando cita:', bookingError)
    }

    revalidatePath('/admin/bookings')

    // Devolvemos el transactionId para que el Frontend sepa qué vincular
    return { success: true, transactionId: transaction.id, points: pointsEarned }
}

// --- FUNCIÓN 2: VINCULAR CLIENTE (NUEVA - LÓGICA QR) ---
export async function linkTransactionToUser(transactionId: string, userId: string) {
    const supabase = await createClient()

    try {
        // 1. Validar Transacción
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .select('points_earned, status, client_id')
            .eq('id', transactionId)
            .single()

        if (txError || !transaction) throw new Error('Transacción inválida.')
        if (transaction.status !== 'completed') throw new Error('Cobro no finalizado.')
        if (transaction.client_id) throw new Error('Esta venta ya tiene dueño.')

        // 2. Validar Usuario (Cliente)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, loyalty_points, full_name')
            .eq('id', userId)
            .single()

        if (profileError || !profile) throw new Error('Cliente no encontrado.')

        // 3. ACTUALIZACIÓN ATÓMICA (Simulada en código)
        // Vinculamos la venta al usuario
        const { error: updateTxError } = await supabase
            .from('transactions')
            .update({ client_id: userId })
            .eq('id', transactionId)

        if (updateTxError) throw new Error('Falló la vinculación.')

        // Sumamos los puntos al perfil
        const newTotal = (profile.loyalty_points || 0) + (transaction.points_earned || 0)

        const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ loyalty_points: newTotal })
            .eq('id', userId)

        if (updateProfileError) {
            // Nota crítica: Aquí idealmente haríamos rollback, pero en MVP logueamos el error grave.
            console.error('CRITICAL: Puntos no sumados pero venta vinculada', transactionId)
            throw new Error('Error sumando puntos.')
        }

        revalidatePath('/admin') // Refrescar dashboard para ver KPI actualizado

        return {
            success: true,
            message: `¡${transaction.points_earned} Puntos asignados a ${profile.full_name?.split(' ')[0]}!`
        }

    } catch (error) {
        console.error('Error vinculando:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
}

// --- FUNCIÓN 3: REGISTRO RÁPIDO WALK-IN ---
export async function createWalkIn(formData: FormData) {
    const supabase = await createClient()

    const serviceId = formData.get('service_id') as string
    const staffId = formData.get('staff_id') as string
    const tenantId = formData.get('tenant_id') as string
    const startTime = formData.get('start_time') as string
    const clientName = formData.get('client_name') as string || "Cliente Walk-in"

    const { data: service } = await supabase
        .from('services')
        .select('duration_min, price')
        .eq('id', serviceId)
        .single()

    if (!service) return { error: 'Servicio no válido' }

    const startDate = new Date(startTime)
    const endDate = new Date(startDate.getTime() + service.duration_min * 60000)

    const { error } = await supabase.from('bookings').insert({
        tenant_id: tenantId,
        service_id: serviceId,
        staff_id: staffId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'confirmed',
        notes: `WALK-IN | Cliente: ${clientName}`,
        customer_id: null
    })

    if (error) {
        console.error('Error walk-in:', error)
        return { error: 'No se pudo registrar.' }
    }

    revalidatePath('/admin/bookings')
    return { success: true }
}