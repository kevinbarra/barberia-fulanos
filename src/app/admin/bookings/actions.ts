'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- FUNCIÓN 1: PROCESAR COBRO (Ya la tenías) ---
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

    // 2. Crear la Transacción
    const { error: txError } = await supabase.from('transactions').insert({
        tenant_id: booking.tenant_id,
        staff_id: booking.staff_id,
        service_id: booking.service_id,
        amount: data.amount,
        payment_method: data.payment_method,
        client_id: null,
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
    }

    revalidatePath('/admin/bookings')
    return { success: true }
}

// --- FUNCIÓN 2: REGISTRO RÁPIDO WALK-IN (NUEVA) ---
export async function createWalkIn(formData: FormData) {
    const supabase = await createClient()

    // 1. Obtener datos básicos del formulario
    const serviceId = formData.get('service_id') as string
    const staffId = formData.get('staff_id') as string
    const tenantId = formData.get('tenant_id') as string
    const startTime = formData.get('start_time') as string // "2023-11-27T14:30"

    // Nombre opcional, si no pone nada usamos un genérico
    const clientName = formData.get('client_name') as string || "Cliente Walk-in"

    // 2. Necesitamos la duración del servicio para calcular a qué hora termina
    const { data: service } = await supabase
        .from('services')
        .select('duration_min, price')
        .eq('id', serviceId)
        .single()

    if (!service) return { error: 'Servicio no válido' }

    const startDate = new Date(startTime)
    // Calculamos fin: inicio + minutos
    const endDate = new Date(startDate.getTime() + service.duration_min * 60000)

    // 3. Crear la cita (Directamente como confirmada)
    const { error } = await supabase.from('bookings').insert({
        tenant_id: tenantId,
        service_id: serviceId,
        staff_id: staffId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'confirmed',
        notes: `WALK-IN | Cliente: ${clientName}`, // Marca distintiva
        customer_id: null // Sin cuenta de usuario asociada
    })

    if (error) {
        console.error('Error walk-in:', error)
        return { error: 'No se pudo registrar.' }
    }

    revalidatePath('/admin/bookings')
    return { success: true }
}