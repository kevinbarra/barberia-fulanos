'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendBookingEmail, sendStaffNewBookingNotification } from '@/lib/email'
import { fromZonedTime } from 'date-fns-tz'
import { revalidatePath } from 'next/cache'
import { DEFAULT_TIMEZONE } from '@/lib/constants';

const TIMEZONE = DEFAULT_TIMEZONE;

export async function getTakenRanges(staffId: string, dateStr: string) {
    const supabase = await createClient()

    const startOfDay = fromZonedTime(`${dateStr} 00:00:00`, TIMEZONE).toISOString()
    const endOfDay = fromZonedTime(`${dateStr} 23:59:59`, TIMEZONE).toISOString()

    const { data: bookings } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('staff_id', staffId)
        .in('status', ['confirmed', 'seated', 'completed'])
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

export async function createBooking(data: {
    tenant_id: string;
    service_id: string;
    staff_id: string;
    start_time: string; // "2023-10-25T10:00"
    client_name: string;
    client_phone: string;
    client_email: string;
    duration_min: number;
    customer_id?: string | null;
    origin?: string;
}) {
    // Usar cliente normal para el booking (funciona con RLS para guests)
    const supabase = await createClient()

    // 1. Validaciones - Obtener info del servicio y tenant (públicas, no necesitan admin)
    const [serviceResult, tenantResult] = await Promise.all([
        supabase.from('services').select('name, price').eq('id', data.service_id).single(),
        supabase.from('tenants').select('name, settings').eq('id', data.tenant_id).single()
    ]);

    const realServiceName = serviceResult.data?.name || "Servicio General";
    const servicePrice = serviceResult.data?.price; // Price snapshot
    const businessName = tenantResult.data?.name || "AgendaBarber";

    // 1.0.1 CHECK: Guest Checkout Setting
    // Default to true (enabled) if settings is null or key is missing
    const tenantSettings = tenantResult.data?.settings as { guest_checkout_enabled?: boolean } | null;
    const isGuestCheckoutEnabled = tenantSettings?.guest_checkout_enabled !== false; // Default: true

    // If guest checkout is DISABLED and there's no customer_id (i.e., this is a guest booking), block it
    if (!isGuestCheckoutEnabled && !data.customer_id) {
        return {
            success: false,
            error: 'Este negocio requiere que inicies sesión para reservar.'
        };
    }

    // 1.1 Obtener datos del staff con admin client (bypass RLS para email)
    let staffEmail: string | undefined;
    let realStaffName = "El equipo";

    try {
        console.log('[BOOKING] Creating admin client for staff data...');
        const adminClient = createAdminClient();
        console.log('[BOOKING] Admin client created, querying staff_id:', data.staff_id);

        const { data: staffData, error: staffError } = await adminClient
            .from('profiles')
            .select('full_name, email')
            .eq('id', data.staff_id)
            .single();

        if (staffError) {
            console.error('[BOOKING] Staff query error:', staffError);
        } else if (staffData) {
            realStaffName = staffData.full_name || "El equipo";
            staffEmail = staffData.email;
            console.log('[BOOKING] Staff data found:', {
                name: realStaffName,
                email: staffEmail || '(no email)'
            });
        } else {
            console.warn('[BOOKING] No staff data returned');
        }
    } catch (adminError) {
        console.error('[BOOKING] Admin client exception:', adminError);
    }

    console.log('[BOOKING] Final data:', {
        service: realServiceName,
        staff: realStaffName,
        hasStaffEmail: !!staffEmail,
        business: businessName
    });

    // 1.5. VINCULACIÓN INTELIGENTE (Anti-Duplicados)
    // Si no viene customer_id (Guest), buscamos si ya existe alguien con ese email.
    let finalCustomerId = data.customer_id;

    /* REVISADO: Deshabilitado para forzar que los Guests sean siempre Guests (customer_id: null)
       y evitar conflictos con reglas de negocio estrictas solicitadas.
    if (!finalCustomerId && data.client_email) {
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', data.client_email)
            .single();

        if (existingProfile) {
            finalCustomerId = existingProfile.id;
        }
    }
    */

    // 2. CORRECCIÓN DE TIMEZONE CRÍTICA
    // Interpretamos la fecha string como hora CDMX, no como UTC.
    // Si data.start_time es "2023-10-25T10:00", esto crea un Date en UTC equivalente (16:00 UTC)
    const startDate = fromZonedTime(data.start_time, TIMEZONE);
    const endDate = new Date(startDate.getTime() + data.duration_min * 60000);

    const guestInfo = `Cliente: ${data.client_name} | Tel: ${data.client_phone} | Email: ${data.client_email}`;

    // Log para debugging
    console.log('[BOOKING] Creating booking with data:', {
        tenant_id: data.tenant_id,
        service_id: data.service_id,
        staff_id: data.staff_id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        customer_id: finalCustomerId
    });

    // Validar que los IDs sean válidos UUIDs antes de insertar
    if (!data.tenant_id || !data.service_id || !data.staff_id) {
        console.error('[BOOKING] Missing required IDs:', {
            tenant_id: data.tenant_id,
            service_id: data.service_id,
            staff_id: data.staff_id
        });
        return { success: false, error: 'Datos incompletos para la reserva.' }
    }

    // 3. INSERTAR CON ESTADO CONFIRMADO (Auto-Confirm Policy)
    const insertPayload: any = {
        tenant_id: data.tenant_id,
        service_id: data.service_id,
        staff_id: data.staff_id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'confirmed', // CHANGE: Auto-confirm immediately
        notes: guestInfo, // Mantenemos redundancia en notes por compatibilidad
        // PRICE SNAPSHOT (immutable for financial integrity)
        price_at_booking: servicePrice,
        service_name_at_booking: realServiceName,
        // ORIGIN TRACKING
        origin: data.origin || 'web'
    };

    // LOGICA GUEST VS REGISTERED
    // ALWAYS save guest fields from input (supports "booking for a friend")
    // The input name is the source of truth for THIS booking
    insertPayload.guest_name = data.client_name;
    insertPayload.guest_phone = data.client_phone;
    insertPayload.guest_email = data.client_email || null;

    // If logged in, also link to customer_id for loyalty points
    if (finalCustomerId) {
        insertPayload.customer_id = finalCustomerId;
    } else {
        insertPayload.customer_id = null;
    }

    const { data: newBooking, error: insertError } = await supabase
        .from('bookings')
        .insert(insertPayload)
        .select('id')
        .single()

    if (insertError) {
        // Check if this is a double-booking constraint violation
        if (insertError.message?.includes('no_double_booking')) {
            return {
                success: false,
                error: 'Lo sentimos, este horario acaba de ser ocupado por otra persona. Por favor selecciona otro horario.'
            }
        }
        console.error('[BOOKING] Error al insertar:', insertError)
        return { success: false, error: `Error al crear reserva: ${insertError.message}` }
    }

    console.log('[BOOKING] Booking created successfully:', newBooking.id);

    // 4. VALIDAR CONFLICTOS POST-INSERT (anti race condition)
    const { count: conflictCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', data.staff_id)
        .in('status', ['confirmed', 'seated', 'pending'])
        .neq('id', newBooking.id)
        .lt('start_time', endDate.toISOString())
        .gt('end_time', startDate.toISOString())

    const { count: blockCount } = await supabase
        .from('time_blocks')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', data.staff_id)
        .lt('start_time', endDate.toISOString())
        .gt('end_time', startDate.toISOString())

    if ((conflictCount && conflictCount > 0) || (blockCount && blockCount > 0)) {
        // ROLLBACK: Eliminar la reserva que acabamos de crear
        await supabase.from('bookings').delete().eq('id', newBooking.id)
        return {
            success: false,
            error: 'Este horario fue tomado mientras procesábamos. Elige otro.'
        }
    }

    // 5. CONFIRMACIÓN IMPLÍCITA (Ya insertamos como confirmed)
    // No explicit update needed.

    // 6. Formatear fecha/hora para emails
    const dateStr = startDate.toLocaleDateString('es-MX', {
        timeZone: TIMEZONE,
        weekday: 'long', day: 'numeric', month: 'long'
    });
    const timeStr = startDate.toLocaleTimeString('es-MX', {
        timeZone: TIMEZONE,
        hour: '2-digit', minute: '2-digit'
    });

    // 7. ENVIAR NOTIFICACIONES (en paralelo, no bloqueantes)
    /* 
    // TEMPORARY DISABLED FOR PRODUCTION SETUP (PREVENT SPAM)
    
    // 7.1 Email de confirmación al cliente
    sendBookingEmail({
        clientName: data.client_name,
        clientEmail: data.client_email,
        serviceName: realServiceName,
        barberName: realStaffName,
        date: dateStr,
        time: timeStr,
        businessName
    });

    // 7.2 Email al barbero asignado
    if (staffEmail) {
        sendStaffNewBookingNotification({
            staffEmail,
            staffName: realStaffName,
            clientName: data.client_name,
            serviceName: realServiceName,
            date: dateStr,
            time: timeStr,
            businessName,
            isOwnerNotification: false
        });
    }

    // 7.3 Email al owner del negocio
    const { data: ownerData } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('tenant_id', data.tenant_id)
        .eq('role', 'owner')
        .single();

    if (ownerData?.email && ownerData.email !== staffEmail) {
        sendStaffNewBookingNotification({
            staffEmail: ownerData.email,
            staffName: realStaffName,
            clientName: data.client_name,
            serviceName: realServiceName,
            date: dateStr,
            time: timeStr,
            businessName,
            isOwnerNotification: true
        });
    }
    */

    // 8. BROADCAST para notificación en tiempo real al admin
    // Esto no depende de RLS, funciona siempre
    try {
        const broadcastClient = createAdminClient();
        const channel = broadcastClient.channel(`booking-notifications-${data.tenant_id}`);

        await channel.send({
            type: 'broadcast',
            event: 'new-booking',
            payload: {
                id: newBooking.id,
                clientName: data.client_name,
                serviceName: realServiceName,
                staffName: realStaffName,
                time: timeStr,
                date: dateStr
            }
        });

        console.log('[BOOKING] Broadcast sent to admin channel');
    } catch (broadcastError) {
        console.warn('[BOOKING] Broadcast failed (non-critical):', broadcastError);
    }

    // Revalidar rutas para que aparezca en POS y Schedule
    revalidatePath('/admin/pos');
    revalidatePath('/admin/schedule');
    revalidatePath('/app');

    return {
        success: true,
        booking: {
            id: newBooking.id,
            guest_name: data.client_name,
            guest_email: data.client_email || null,
            guest_phone: data.client_phone || null,
            service_name: realServiceName,
            service_price: servicePrice,
            start_time: startDate.toISOString(),
            staff_name: realStaffName,
            date_formatted: dateStr,
            time_formatted: timeStr
        }
    }
}