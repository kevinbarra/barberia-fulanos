'use server'

import { createClient } from '@/utils/supabase/server'
import { sendBookingEmail } from '@/lib/email' // Importamos el servicio de email

export async function createBooking(data: {
    tenant_id: string;
    service_id: string;
    staff_id: string;
    start_time: string;
    client_name: string;
    client_phone: string;
    client_email: string;
    duration_min: number;
}) {
    const supabase = await createClient()

    const startDate = new Date(data.start_time);
    const endDate = new Date(startDate.getTime() + data.duration_min * 60000);

    const guestInfo = `Cliente: ${data.client_name} | Tel: ${data.client_phone} | Email: ${data.client_email}`;

    // 1. Guardar en Base de Datos
    const { error } = await supabase.from('bookings').insert({
        tenant_id: data.tenant_id,
        service_id: data.service_id,
        staff_id: data.staff_id,
        customer_id: null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'confirmed',
        notes: guestInfo
    })

    if (error) {
        console.error('Error al reservar:', error)
        return { error: 'No se pudo agendar la cita.' }
    }

    // 2. ENVIAR EMAIL (Sin await para que sea rápido para el usuario)
    const dateStr = startDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    sendBookingEmail({
        clientName: data.client_name,
        clientEmail: data.client_email,
        serviceName: "Corte de Cabello", // Idealmente dinámico, pero funcional para MVP
        barberName: "Tu Barbero",
        date: dateStr,
        time: timeStr
    });

    return { success: true }
}