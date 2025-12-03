'use server'

import { createClient } from '@/utils/supabase/server'
import { sendBookingEmail } from '@/lib/email'
import { fromZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/Mexico_City';

export async function getTakenSlots(staffId: string, dateStr: string) {
    const supabase = await createClient()
    const startOfDay = fromZonedTime(`${dateStr} 00:00:00`, TIMEZONE).toISOString()
    const endOfDay = fromZonedTime(`${dateStr} 23:59:59`, TIMEZONE).toISOString()

    const { data } = await supabase
        .from('bookings')
        .select('start_time')
        .eq('staff_id', staffId)
        .neq('status', 'cancelled')
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)

    return data?.map(b => b.start_time) || []
}

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

    const [serviceResult, staffResult] = await Promise.all([
        supabase.from('services').select('name').eq('id', data.service_id).single(),
        supabase.from('profiles').select('full_name').eq('id', data.staff_id).single()
    ]);

    const realServiceName = serviceResult.data?.name || "Servicio General";
    const realStaffName = staffResult.data?.full_name || "El equipo";

    const startDate = new Date(data.start_time);
    const endDate = new Date(startDate.getTime() + data.duration_min * 60000);

    const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', data.staff_id)
        .neq('status', 'cancelled')
        .lt('start_time', endDate.toISOString())
        .gt('end_time', startDate.toISOString())

    if (count && count > 0) {
        return { success: false, error: 'Lo sentimos, este horario acaba de ser ocupado.' }
    }

    const guestInfo = `Cliente: ${data.client_name} | Tel: ${data.client_phone} | Email: ${data.client_email}`;

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