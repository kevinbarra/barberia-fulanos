'use server'

import { createClient } from '@/utils/supabase/server'
import { sendBookingEmail } from '@/lib/email'

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

    // 1. VALIDACIÓN DE DATOS REALES (Consultar nombres)
    // Hacemos las consultas en paralelo para no perder tiempo
    const [serviceResult, staffResult] = await Promise.all([
        supabase.from('services').select('name').eq('id', data.service_id).single(),
        supabase.from('profiles').select('full_name').eq('id', data.staff_id).single()
    ]);

    const realServiceName = serviceResult.data?.name || "Servicio General";
    const realStaffName = staffResult.data?.full_name || "El equipo";

    // 2. Calcular Fechas
    const startDate = new Date(data.start_time);
    const endDate = new Date(startDate.getTime() + data.duration_min * 60000);

    const guestInfo = `Cliente: ${data.client_name} | Tel: ${data.client_phone} | Email: ${data.client_email}`;

    // 3. Guardar en Base de Datos
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

    // 4. PREPARAR EMAIL CON DATOS REALES
    // Formato bonito de fecha: "Jueves, 27 de Noviembre"
    const dateStr = startDate.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    // Formato bonito de hora: "4:30 PM"
    const timeStr = startDate.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    // 5. ENVIAR
    await sendBookingEmail({
        clientName: data.client_name,
        clientEmail: data.client_email,
        serviceName: realServiceName, // <--- AHORA SÍ ES REAL
        barberName: realStaffName,    // <--- AHORA SÍ ES REAL
        date: dateStr,
        time: timeStr
    });

    return { success: true }
}