'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { broadcastBookingEvent } from '@/lib/broadcast'

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
        .select('tenant_id, staff_id, service_id, status')
        .eq('id', data.booking_id)
        .single()

    if (!booking) return { error: 'Cita no encontrada' }

    if (booking.status === 'completed') {
        return { error: 'Esta cita ya fue cobrada.' }
    }
    if (booking.status === 'cancelled') {
        return { error: 'No se puede cobrar una cita cancelada.' }
    }

    // 2. CALCULAR PUNTOS (Regla de negocio: 10% del valor en puntos)
    const pointsEarned = Math.floor(data.amount * 0.10)

    // 3. Crear la Transacción
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
        .select('id')
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

    // Broadcast for real-time update
    await broadcastBookingEvent(booking.tenant_id, 'booking-completed', {
        id: data.booking_id,
        status: 'completed'
    })

    revalidatePath('/admin/bookings')
    revalidatePath('/admin/pos')

    return { success: true, transactionId: transaction.id, points: pointsEarned }
}

// --- FUNCIÓN 2: VINCULAR CLIENTE (QR) ---
// Usamos adminClient porque staff necesita leer profiles de clientes (RLS lo bloquea)
export async function linkTransactionToUser(transactionId: string, scannedValue: string) {
    const supabase = createAdminClient()

    try {
        console.log('[linkTransactionToUser] Starting with:', { transactionId, scannedValue })

        // 1. Validar Transacción
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .select('points_earned, status, client_id')
            .eq('id', transactionId)
            .single()

        if (txError || !transaction) {
            console.error('[linkTransactionToUser] Transaction error:', txError)
            throw new Error('Transacción inválida.')
        }
        if (transaction.status !== 'completed') throw new Error('Cobro no finalizado.')
        if (transaction.client_id) throw new Error('Esta venta ya tiene dueño.')

        // 2. Buscar Usuario - Intentar primero por UUID, luego por email
        let profile = null

        // Intentar buscar por UUID
        const { data: profileById, error: profileByIdError } = await supabase
            .from('profiles')
            .select('id, loyalty_points, full_name')
            .eq('id', scannedValue)
            .single()

        if (profileById) {
            profile = profileById
            console.log('[linkTransactionToUser] Found by UUID:', profile.full_name)
        } else {
            // Intentar buscar por email (algunos QR pueden contener email)
            console.log('[linkTransactionToUser] UUID lookup failed, trying email lookup...')
            const { data: profileByEmail, error: profileByEmailError } = await supabase
                .from('profiles')
                .select('id, loyalty_points, full_name')
                .eq('email', scannedValue.toLowerCase().trim())
                .single()

            if (profileByEmail) {
                profile = profileByEmail
                console.log('[linkTransactionToUser] Found by email:', profile.full_name)
            } else {
                console.error('[linkTransactionToUser] Profile not found:', { scannedValue, profileByIdError, profileByEmailError })
                throw new Error('Cliente no encontrado.')
            }
        }

        if (!profile) throw new Error('Cliente no encontrado.')

        // 3. ACTUALIZACIÓN ATÓMICA
        const { error: updateTxError } = await supabase
            .from('transactions')
            .update({ client_id: profile.id })
            .eq('id', transactionId)

        if (updateTxError) throw new Error('Falló la vinculación.')

        const newTotal = (profile.loyalty_points || 0) + (transaction.points_earned || 0)

        const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ loyalty_points: newTotal })
            .eq('id', profile.id)

        if (updateProfileError) {
            console.error('CRITICAL: Puntos no sumados', transactionId)
            throw new Error('Error sumando puntos.')
        }

        revalidatePath('/admin')

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

    // Get service and staff names for broadcast
    const { data: serviceData } = await supabase.from('services').select('name').eq('id', serviceId).single()
    const { data: staffData } = await supabase.from('profiles').select('full_name').eq('id', staffId).single()

    const timeStr = startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

    // Broadcast for real-time notification
    await broadcastBookingEvent(tenantId, 'new-booking', {
        id: 'walkin-' + Date.now(),
        clientName: clientName,
        serviceName: serviceData?.name || 'Servicio',
        staffName: staffData?.full_name || 'Staff',
        time: timeStr
    })

    revalidatePath('/admin/bookings')
    revalidatePath('/admin/pos')
    revalidatePath('/admin/schedule')
    return { success: true }
}

// --- FUNCIÓN 4: CANCELAR CITA (ADMIN) ---
export async function cancelBookingAdmin(bookingId: string, reason: string) {
    const supabase = await createClient()

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // Get booking info for broadcast
    const { data: bookingInfo } = await supabase
        .from('bookings')
        .select('tenant_id')
        .eq('id', bookingId)
        .single()

    // 2. Cancelar y guardar motivo
    const { error } = await supabase
        .from('bookings')
        .update({
            status: 'cancelled',
            notes: reason ? `Cancelado por admin: ${reason}` : 'Cancelado por administración'
        })
        .eq('id', bookingId)

    if (error) {
        console.error(error)
        return { error: 'Error al cancelar la cita.' }
    }

    // Broadcast for real-time update
    if (bookingInfo?.tenant_id) {
        await broadcastBookingEvent(bookingInfo.tenant_id, 'booking-cancelled', {
            id: bookingId,
            status: 'cancelled'
        })
    }

    revalidatePath('/admin/bookings')
    revalidatePath('/admin/pos')
    revalidatePath('/app')

    return { success: true, message: 'Cita cancelada.' }
}

// --- FUNCIÓN 5: MARCAR NO-SHOW ---
export async function markNoShow(bookingId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // 1. Obtener la cita
    const { data: booking } = await supabase
        .from('bookings')
        .select('status, customer_id, tenant_id')
        .eq('id', bookingId)
        .single()

    if (!booking) return { error: 'Cita no encontrada.' }

    if (booking.status !== 'confirmed') {
        return { error: 'Solo se pueden marcar como no-show las citas confirmadas.' }
    }

    // 2. Actualizar cita a no_show
    const { error: bookingError } = await supabase
        .from('bookings')
        .update({
            status: 'no_show',
            notes: 'Cliente no se presentó'
        })
        .eq('id', bookingId)

    if (bookingError) {
        console.error(bookingError)
        return { error: 'Error al marcar no-show.' }
    }

    // 3. Incrementar contador si hay cliente registrado
    if (booking.customer_id) {
        const { error: profileError } = await supabase.rpc('increment_no_show', {
            user_id: booking.customer_id
        })

        if (profileError) {
            console.error('Error incrementando no-show:', profileError)
            // No retornamos error, la cita ya se marcó
        }
    }

    // Broadcast for real-time update
    if (booking.tenant_id) {
        await broadcastBookingEvent(booking.tenant_id, 'booking-noshow', {
            id: bookingId,
            status: 'no_show'
        })
    }

    revalidatePath('/admin/bookings')
    revalidatePath('/admin/pos')

    return { success: true, message: 'Marcado como No-Show.' }
}