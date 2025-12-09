import { createAdminClient } from '@/utils/supabase/admin';
import { sendBookingReminder } from '@/lib/email';

const TIMEZONE = 'America/Mexico_City';

// Types for Supabase relations
type ServiceRelation = { name: string } | { name: string }[] | null;
type StaffRelation = { full_name: string } | { full_name: string }[] | null;
type TenantRelation = { name: string } | { name: string }[] | null;
type CustomerRelation = { full_name: string; email: string } | { full_name: string; email: string }[] | null;

function getFirst<T>(relation: T | T[] | null): T | null {
    if (!relation) return null;
    if (Array.isArray(relation)) return relation[0] || null;
    return relation;
}

export async function GET(request: Request) {
    // Verificar que viene de Vercel Cron (opcional pero recomendado)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
            return new Response('Unauthorized', { status: 401 });
        }
    }

    const supabase = createAdminClient();

    // Calcular rango de 24h desde ahora
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Buscar reservas que son en ~24h (ventana de 1 hora)
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            start_time,
            status,
            notes,
            customer_id,
            service:services(name),
            staff:profiles!bookings_staff_id_fkey(full_name),
            tenant:tenants(name),
            customer:profiles!bookings_customer_id_fkey(full_name, email)
        `)
        .eq('status', 'confirmed')
        .gte('start_time', tomorrow.toISOString())
        .lt('start_time', tomorrowEnd.toISOString());

    if (error) {
        console.error('Error fetching bookings for reminders:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
        return Response.json({ message: 'No bookings to remind', count: 0 });
    }

    let sentCount = 0;
    const results: { bookingId: string; success: boolean; email?: string }[] = [];

    for (const booking of bookings) {
        // Extraer datos de las relaciones
        const customer = getFirst(booking.customer as CustomerRelation);
        const service = getFirst(booking.service as ServiceRelation);
        const staff = getFirst(booking.staff as StaffRelation);
        const tenant = getFirst(booking.tenant as TenantRelation);

        // Extraer email del cliente
        let clientEmail = '';
        let clientName = 'Cliente';

        if (customer?.email) {
            clientEmail = customer.email;
            clientName = customer.full_name || 'Cliente';
        } else if (booking.notes) {
            // Intentar extraer email de notes (formato: "Email: xxx@xxx.com")
            const emailMatch = booking.notes.match(/Email:\s*([^\s|]+)/i);
            const nameMatch = booking.notes.match(/Cliente:\s*([^|]+)/i);
            if (emailMatch) clientEmail = emailMatch[1].trim();
            if (nameMatch) clientName = nameMatch[1].trim();
        }

        if (!clientEmail) {
            results.push({ bookingId: booking.id, success: false });
            continue;
        }

        // Formatear fecha/hora
        const startDate = new Date(booking.start_time);
        const dateStr = startDate.toLocaleDateString('es-MX', {
            timeZone: TIMEZONE,
            weekday: 'long', day: 'numeric', month: 'long'
        });
        const timeStr = startDate.toLocaleTimeString('es-MX', {
            timeZone: TIMEZONE,
            hour: '2-digit', minute: '2-digit'
        });

        // Enviar recordatorio
        const result = await sendBookingReminder({
            clientName,
            clientEmail,
            serviceName: service?.name || 'Servicio',
            barberName: staff?.full_name || 'Tu barbero',
            date: dateStr,
            time: timeStr,
            businessName: tenant?.name || 'AgendaBarber'
        });

        if (result?.success) {
            sentCount++;
        }
        results.push({ bookingId: booking.id, success: result?.success || false, email: clientEmail });
    }

    return Response.json({
        message: `Reminders sent`,
        total: bookings.length,
        sent: sentCount,
        results
    });
}
