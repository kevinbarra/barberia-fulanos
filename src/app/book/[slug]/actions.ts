'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBooking(data: {
    tenant_id: string;
    service_id: string;
    staff_id: string;
    start_time: string; // Formato ISO o fecha completa
    client_name: string;
    client_phone: string;
    client_email: string;
    duration_min: number;
}) {
    const supabase = await createClient()

    // 1. Calcular hora de fin
    const startDate = new Date(data.start_time);
    const endDate = new Date(startDate.getTime() + data.duration_min * 60000);

    // 2. Preparar los datos
    // Como es un cliente invitado (Guest), guardamos sus datos en las notas
    const guestInfo = `Cliente: ${data.client_name} | Tel: ${data.client_phone} | Email: ${data.client_email}`;

    // 3. Insertar en bookings
    const { error } = await supabase.from('bookings').insert({
        tenant_id: data.tenant_id,
        service_id: data.service_id,
        staff_id: data.staff_id,
        customer_id: null, // Es un invitado, no tiene cuenta aún
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'confirmed', // Asumimos confirmado por ahora
        notes: guestInfo
    })

    if (error) {
        console.error('Error al reservar:', error)
        return { error: 'No se pudo agendar la cita.' }
    }

    // 4. Retornar éxito
    return { success: true }
}