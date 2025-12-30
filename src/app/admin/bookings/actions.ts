'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { broadcastBookingEvent } from '@/lib/broadcast'
import { fromZonedTime } from 'date-fns-tz'
import { isBefore } from 'date-fns'
import { DEFAULT_TIMEZONE } from '@/lib/constants'

// --- FUNCIÓN 1: PROCESAR COBRO (OPTIMIZADA) ---
export async function processPayment(data: {
    booking_id: string;
    amount: number;
    payment_method: string;
}) {
    const supabase = await createClient()

    // 1. Obtener detalles de la cita (incluyendo customer_id para auto-vincular)
    const { data: booking } = await supabase
        .from('bookings')
        .select('tenant_id, staff_id, service_id, status, customer_id, start_time, customers:customer_id(full_name)')
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

    // 3. Determinar si hay cliente vinculado (viene de reserva)
    const customerId = booking.customer_id || null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customerName = (booking.customers as any)?.full_name || null

    // 4. BACK-DATING LOGIC: Si la cita es pasada, usar su fecha original.
    // Esto permite registrar "cortes olvidados" con la fecha correcta.
    const now = new Date()
    const bookingDate = new Date(booking.start_time)
    const transactionDate = isBefore(bookingDate, now)
        ? booking.start_time  // Cita pasada → usar fecha de la cita
        : now.toISOString()   // Cita futura/presente → usar ahora

    // 5. Crear la Transacción (ya vinculada si hay cliente)
    const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
            tenant_id: booking.tenant_id,
            staff_id: booking.staff_id,
            service_id: booking.service_id,
            amount: data.amount,
            payment_method: data.payment_method,
            client_id: customerId, // Auto-vinculado si viene de reserva
            points_earned: pointsEarned,
            status: 'completed',
            created_at: transactionDate
        })
        .select('id')
        .single()

    if (txError || !transaction) {
        console.error('Error creando transacción:', txError)
        return { success: false, error: 'No se pudo registrar el cobro' }
    }

    // 5. Si hay cliente, sumar puntos automáticamente
    if (customerId) {
        const { data: clientProfile } = await supabase
            .from('profiles')
            .select('loyalty_points')
            .eq('id', customerId)
            .single()

        if (clientProfile) {
            const newTotal = (clientProfile.loyalty_points || 0) + pointsEarned
            await supabase
                .from('profiles')
                .update({ loyalty_points: newTotal })
                .eq('id', customerId)
        }
    }

    // 6. Actualizar la Cita a "Completada"
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

    return {
        success: true,
        transactionId: transaction.id,
        points: pointsEarned,
        clientLinked: !!customerId,
        clientName: customerName
    }
}

// --- FUNCIÓN 2: VINCULAR CLIENTE (QR) con Smart Resolution ---
// Resuelve inteligentemente: puede recibir user_id directo o booking_id
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

        // 2. SMART RESOLUTION: Intentar identificar qué tipo de QR es
        let finalUserId: string | null = null
        let source = 'direct'

        // PASO A: ¿Es un usuario directo (profile)?
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('id, full_name, loyalty_points')
            .eq('id', scannedValue)
            .single()

        if (userProfile) {
            finalUserId = userProfile.id
            source = 'profile'
            console.log(`[LINK] Usuario encontrado directamente: ${userProfile.full_name}`)
        } else {
            // PASO B: ¿Es un ID de reserva (booking)?
            console.log(`[LINK] ID ${scannedValue} no es perfil, buscando en bookings...`)
            const { data: booking } = await supabase
                .from('bookings')
                .select('customer_id')
                .eq('id', scannedValue)
                .single()

            if (booking && booking.customer_id) {
                finalUserId = booking.customer_id
                source = 'booking'
                console.log(`[LINK] Cliente encontrado vía reserva: ${booking.customer_id}`)
            } else {
                // PASO C: Intentar por email (legacy)
                console.log('[LINK] No es booking, intentando por email...')
                const { data: profileByEmail } = await supabase
                    .from('profiles')
                    .select('id, full_name, loyalty_points')
                    .eq('email', scannedValue.toLowerCase().trim())
                    .single()

                if (profileByEmail) {
                    finalUserId = profileByEmail.id
                    source = 'email'
                    console.log(`[LINK] Usuario encontrado por email: ${profileByEmail.full_name}`)
                }
            }
        }

        // Si no encontró nada, error
        if (!finalUserId) {
            throw new Error('QR no válido: No se encontró cliente ni reserva asociada.')
        }

        // 3. Obtener perfil del usuario final (para puntos y nombre)
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, loyalty_points, full_name')
            .eq('id', finalUserId)
            .single()

        if (!profile) {
            throw new Error('Cliente no encontrado en el sistema.')
        }

        // 4. ACTUALIZACIÓN ATÓMICA
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
        revalidatePath('/admin/pos')

        // 5. Mensajes diferenciados según fuente
        const firstName = profile.full_name?.split(' ')[0] || 'Cliente'
        const points = transaction.points_earned || 0

        let message = `¡${points} Puntos asignados a ${firstName}!`
        if (source === 'booking') {
            message = `¡Cliente vinculado desde su Cita! +${points} puntos para ${firstName}`
        }

        return { success: true, message }

    } catch (error) {
        console.error('[LINK_TX_ERROR]', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
}

// --- FUNCIÓN 3: REGISTRO RÁPIDO WALK-IN (con Timezone Fix) ---
export async function createWalkIn(formData: FormData) {
    const supabase = await createClient()

    const serviceId = formData.get('service_id') as string
    const staffId = formData.get('staff_id') as string
    const tenantId = formData.get('tenant_id') as string
    const startTime = formData.get('start_time') as string
    const clientName = formData.get('client_name') as string || "Cliente Walk-in"
    const clientEmail = formData.get('client_email') as string || null

    const { data: service } = await supabase
        .from('services')
        .select('duration_min, price')
        .eq('id', serviceId)
        .single()

    if (!service) return { error: 'Servicio no válido' }

    // TIMEZONE FIX: Interpretar el string como hora local de México
    const startDate = fromZonedTime(startTime, DEFAULT_TIMEZONE)
    const endDate = new Date(startDate.getTime() + service.duration_min * 60000)

    // CUSTOMER LINKING: Buscar por email si se proporciona
    let customerId: string | null = null
    if (clientEmail) {
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', clientEmail.toLowerCase().trim())
            .single()

        if (existingProfile) {
            customerId = existingProfile.id
            console.log(`[WALK-IN] Cliente vinculado por email: ${clientEmail}`)
        }
    }

    const { error } = await supabase.from('bookings').insert({
        tenant_id: tenantId,
        service_id: serviceId,
        staff_id: staffId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'confirmed',
        notes: `WALK-IN | Cliente: ${clientName}${clientEmail ? ` | Email: ${clientEmail}` : ''}`,
        customer_id: customerId
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