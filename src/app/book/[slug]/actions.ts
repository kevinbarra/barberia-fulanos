'use server'

import { createClient } from '@/utils/supabase/server'
import { sendBookingEmail } from '@/lib/email'
import { fromZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/Mexico_City';

// --- OBTENER RANGOS OCUPADOS (Citas + Bloqueos) ---
export async function getTakenRanges(staffId: string, dateStr: string) {
    const supabase = await createClient()

    const startOfDay = fromZonedTime(`${dateStr} 00:00:00`, TIMEZONE).toISOString()
    const endOfDay = fromZonedTime(`${dateStr} 23:59:59`, TIMEZONE).toISOString()

    const { data: bookings } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('staff_id', staffId)
        .neq('status', 'cancelled')
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)

    const { data: blocks } = await supabase
        .from('time_blocks')
        .select('start_time, end_time')
        .eq('staff_id', staffId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)

    const busyRanges = [
        ...(bookings || []),
        ...(blocks || [])
    ].map(item => ({
        start: new Date(item.start_time).getTime(),
        end: new Date(item.end_time).getTime()
    }));

    return busyRanges
}

// --- CREAR RESERVA ---
export async function createBooking(data: {
    tenant_id: string;
    service_id: string;
    staff_id: string;
    start_time: string;
    client_name: string;
    client_phone: string;
    client_email: string;
    duration_min: number;
    customer_id?: string | null; // <--- NUEVO: Opcional, si viene logueado
}) {
    const supabase = await createClient()

    // 1. Validaciones
    const [serviceResult, staffResult] = await Promise.all([
        supabase.from('services').select('name').eq('id', data.service_id).single(),
        supabase.from('profiles').select('full_name').eq('id', data.staff_id).single()
    ]);

    const realServiceName = serviceResult.data?.name || "Servicio General";
    const realStaffName = staffResult.data?.full_name || "El equipo";

    const startDate = new Date(data.start_time);
    const endDate = new Date(startDate.getTime() + data.duration_min * 60000);

    // 2. Chequeo de Disponibilidad
    const { count: bookingConflict } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', data.staff_id)
        .neq('status', 'cancelled')
        .lt('start_time', endDate.toISOString())
        .gt('end_time', startDate.toISOString())

    const { count: blockConflict } = await supabase
        .from('time_blocks')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', data.staff_id)
        .lt('start_time', endDate.toISOString())
        .gt('end_time', startDate.toISOString())

    if ((bookingConflict && bookingConflict > 0) || (blockConflict && blockConflict > 0)) {
        return { success: false, error: 'Lo sentimos, este horario ya no está disponible.' }
    }

    const guestInfo = `Cliente: ${data.client_name} | Tel: ${data.client_phone} | Email: ${data.client_email}`;

    // 3. Insertar Cita
    // Si viene customer_id, lo usamos. Si no, queda NULL (Walk-in anónimo).
    const { error } = await supabase.from('bookings').insert({
        tenant_id: data.tenant_id,
        service_id: data.service_id,
        staff_id: data.staff_id,
        customer_id: data.customer_id || null, // <--- VINCULACIÓN REAL
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'confirmed',
        notes: guestInfo
    })

    if (error) {
        console.error('Error al reservar:', error)
        return { error: 'No se pudo agendar la cita. Intenta nuevamente.' }
    }

    // 4. Email
    const dateStr = startDate.toLocaleDateString('es-MX', {
        timeZone: TIMEZONE,
        weekday: 'long', day: 'numeric', month: 'long'
    });
    const timeStr = startDate.toLocaleTimeString('es-MX', {
        timeZone: TIMEZONE,
        hour: '2-digit', minute: '2-digit'
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