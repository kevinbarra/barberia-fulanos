'use server'

import { createClient } from '@/utils/supabase/server'
import { sendBookingEmail } from '@/lib/email'
import { fromZonedTime } from 'date-fns-tz'
import { addDays } from 'date-fns'

// Configuración de Timezone (Centralizada)
const TIMEZONE = 'America/Mexico_City';

// --- NUEVA FUNCIÓN: OBTENER HORAS OCUPADAS ---
export async function getTakenSlots(staffId: string, dateStr: string) {
    // dateStr viene como "YYYY-MM-DD" del input date
    const supabase = await createClient()

    // 1. Calcular el rango del día en UTC para la consulta
    // "2023-11-30 00:00" en MX -> UTC
    const startOfDay = fromZonedTime(`${dateStr} 00:00:00`, TIMEZONE).toISOString()
    // "2023-11-30 23:59" en MX -> UTC (o inicio del día siguiente)
    const endOfDay = fromZonedTime(`${dateStr} 23:59:59`, TIMEZONE).toISOString()

    // 2. Consultar Citas Confirmadas
    const { data } = await supabase
        .from('bookings')
        .select('start_time')
        .eq('staff_id', staffId)
        .neq('status', 'cancelled') // Ignorar canceladas
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)

    // 3. Devolver array de fechas ISO (UTC)
    return data?.map(b => b.start_time) || []
}

// --- FUNCIÓN EXISTENTE: CREAR RESERVA ---
export async function createBooking(data: {
    tenant_id: string;
    service_id: string;
    staff_id: string;
    start_time: string; // Viene en formato ISO local o UTC
    client_name: string;
    client_phone: string;
    client_email: string;
    duration_min: number;
}) {
    const supabase = await createClient()

    // 1. VALIDACIÓN DE DATOS REALES
    const [serviceResult, staffResult] = await Promise.all([
        supabase.from('services').select('name').eq('id', data.service_id).single(),
        supabase.from('profiles').select('full_name').eq('id', data.staff_id).single()
    ]);

    const realServiceName = serviceResult.data?.name || "Servicio General";
    const realStaffName = staffResult.data?.full_name || "El equipo";

    // 2. Calcular Fechas
    // IMPORTANTE: Asegurar que la fecha se guarde correctamente interpretada
    const startDate = new Date(data.start_time);
    const endDate = new Date(startDate.getTime() + data.duration_min * 60000);

    // 3. Validación Final de Disponibilidad (Doble Check en Servidor)
    // Esto evita la "Race Condition" si dos personas dan clic al mismo tiempo
    const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', data.staff_id)
        .neq('status', 'cancelled')
        // Si hay una cita que empiece antes de que termine esta Y termine después de que empiece esta
        .lt('start_time', endDate.toISOString())
        .gt('end_time', startDate.toISOString())

    if (count && count > 0) {
        return { success: false, error: 'Lo sentimos, este horario acaba de ser ocupado.' }
    }

    const guestInfo = `Cliente: ${data.client_name} | Tel: ${data.client_phone} | Email: ${data.client_email}`;

    // 4. Guardar en Base de Datos
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

    // 5. ENVIAR EMAIL
    const dateStr = startDate.toLocaleDateString('es-MX', {
        timeZone: TIMEZONE,
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    const timeStr = startDate.toLocaleTimeString('es-MX', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    await sendBookingEmail({
        clientName: data.client_name,
        clientEmail: data.client_email,
        serviceName: realServiceName,
        barberName: realStaffName,
        date: dateStr,
        time: timeStr
    });

    return { success: true }
}