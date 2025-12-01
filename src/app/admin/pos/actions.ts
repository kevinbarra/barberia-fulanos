'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function processPosSale(data: {
    staffId: string
    serviceId: string
    price: number
    paymentMethod: string
    duration: number
    tenantId: string
}) {
    const supabase = await createClient()

    try {
        // 1. Crear la Cita "Fantasma" (Para que ocupe espacio en la agenda)
        // Calculamos start/end basado en "AHORA MISMO"
        const now = new Date()
        const endTime = new Date(now.getTime() + data.duration * 60000)

        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
                tenant_id: data.tenantId,
                service_id: data.serviceId,
                staff_id: data.staffId,
                start_time: now.toISOString(),
                end_time: endTime.toISOString(),
                status: 'completed', // Nace completada
                notes: 'Walk-in (POS Ticket)',
                customer_id: null // Anónimo al principio
            })
            .select('id')
            .single()

        if (bookingError || !booking) throw new Error('Error al registrar ocupación')

        // 2. Calcular Puntos (Regla 10%)
        const points = Math.floor(data.price * 0.10)

        // 3. Crear la Transacción (Dinero)
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert({
                tenant_id: data.tenantId,
                staff_id: data.staffId,
                service_id: data.serviceId,
                amount: data.price,
                payment_method: data.paymentMethod,
                status: 'completed',
                created_at: now.toISOString(),
                points_earned: points,
                client_id: null // Se vinculará con QR después
            })
            .select('id')
            .single()

        if (txError || !transaction) throw new Error('Error al procesar cobro')

        revalidatePath('/admin') // Actualizar caja

        return {
            success: true,
            transactionId: transaction.id,
            points: points,
            message: '¡Venta registrada!'
        }

    } catch (error) {
        console.error('POS Error:', error)
        return { success: false, error: 'No se pudo procesar la venta.' }
    }
}