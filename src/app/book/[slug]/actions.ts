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
    is_any_staff?: boolean;
    available_staff_ids?: string[];
}) {
    const supabase = await createClient()

    // 1. Validaciones
    const [serviceResult, tenantResult] = await Promise.all([
        supabase.from('services').select('name, price').eq('id', data.service_id).single(),
        supabase.from('tenants').select('name, settings').eq('id', data.tenant_id).single()
    ]);

    const realServiceName = serviceResult.data?.name || "Servicio General";
    const servicePrice = serviceResult.data?.price || 0;
    const businessName = tenantResult.data?.name || "AgendaBarber";

    const tenantSettings = tenantResult.data?.settings as { 
        guest_checkout_enabled?: boolean,
        payment_rules?: { mode: 'Libre' | 'Anticipo' | 'Pago Total', deposit_type?: string, deposit_value?: number, threshold_amount?: number, mp_access_token?: string }
    } | null;

    const isGuestCheckoutEnabled = tenantSettings?.guest_checkout_enabled !== false;
    const paymentMode = tenantSettings?.payment_rules?.mode || 'Libre';

    if (!isGuestCheckoutEnabled && !data.customer_id) {
        return { success: false, error: 'Este negocio requiere inicio de sesión.' };
    }

    let initialPaymentStatus: 'unpaid' | 'partially_paid' | 'paid' | 'pending_payment' = 'unpaid';
    if (paymentMode === 'Anticipo' || paymentMode === 'Pago Total') {
        initialPaymentStatus = 'pending_payment';
    }

    // --- LOAD BALANCER ---
    let finalStaffId = data.staff_id;
    if (data.is_any_staff && data.available_staff_ids && data.available_staff_ids.length > 0) {
        const dateStr = data.start_time.split('T')[0];
        const startOfDay = fromZonedTime(`${dateStr} 00:00:00`, TIMEZONE).toISOString();
        const endOfDay = fromZonedTime(`${dateStr} 23:59:59`, TIMEZONE).toISOString();

        const { data: staffBookings } = await supabase
            .from('bookings')
            .select('staff_id')
            .in('staff_id', data.available_staff_ids)
            .in('status', ['confirmed', 'seated', 'completed'])
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay);

        const counts: Record<string, number> = {};
        data.available_staff_ids.forEach(id => counts[id] = 0);

        if (staffBookings) {
            staffBookings.forEach(b => {
                if (counts[b.staff_id] !== undefined) counts[b.staff_id]++;
            });
        }

        let minBookings = Infinity;
        let selectedStaffId = finalStaffId;
        for (const [id, count] of Object.entries(counts)) {
            if (count < minBookings) {
                minBookings = count;
                selectedStaffId = id;
            }
        }
        finalStaffId = selectedStaffId;
    }

    // Info del Staff
    let realStaffName = "El equipo";
    try {
        const adminClient = createAdminClient();
        const { data: staffData } = await adminClient
            .from('profiles')
            .select('full_name')
            .eq('id', finalStaffId)
            .single();
        if (staffData) realStaffName = staffData.full_name || "El equipo";
    } catch (e) { console.error(e); }

    // 2. TIMEZONE
    const startDate = fromZonedTime(data.start_time, TIMEZONE);
    const endDate = new Date(startDate.getTime() + data.duration_min * 60000);

    const dateStrFormatted = startDate.toLocaleDateString('es-MX', { timeZone: TIMEZONE, weekday: 'long', day: 'numeric', month: 'long' });
    const timeStrFormatted = startDate.toLocaleTimeString('es-MX', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });

    // 3. INSERTAR
    const finalClientName = data.client_name?.trim() || "Cliente";

    const insertPayload: any = {
        tenant_id: data.tenant_id,
        service_id: data.service_id,
        staff_id: finalStaffId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: initialPaymentStatus === 'pending_payment' ? 'pending' : 'confirmed', 
        payment_status: initialPaymentStatus,
        total_price: servicePrice,
        price_at_booking: servicePrice,
        service_name_at_booking: realServiceName,
        origin: data.origin || 'web',
        is_any_staff: data.is_any_staff || false,
        guest_name: finalClientName,
        guest_phone: data.client_phone,
        guest_email: data.client_email || null,
        customer_id: data.customer_id || null,
        notes: `Cliente: ${finalClientName} | Tel: ${data.client_phone} | Email: ${data.client_email}`
    };

    const { data: newBooking, error: insertError } = await supabase
        .from('bookings')
        .insert(insertPayload)
        .select('id')
        .single();

    if (insertError) {
        if (insertError.message?.includes('no_double_booking')) {
            return { success: false, error: 'Ese horario se ocupó. Elige otro.' };
        }
        return { success: false, error: 'Error al reservar.' };
    }

    if (!newBooking) return { success: false, error: 'Error al crear la reserva.' };

    // 4. MERCADO PAGO
    let paymentUrl = null;
    let depositAmount = 0;

    if (paymentMode !== 'Libre') {
        const rules = tenantSettings?.payment_rules;
        const threshold = Number(rules?.threshold_amount || 0);
        
        if (paymentMode === 'Pago Total') {
            depositAmount = Number(servicePrice);
        } else if (paymentMode === 'Anticipo') {
            if (Number(servicePrice) >= threshold) {
                if (rules?.deposit_type === 'percentage') {
                    depositAmount = (Number(servicePrice) * Number(rules?.deposit_value || 0)) / 100;
                } else {
                    depositAmount = Math.min(Number(servicePrice), Number(rules?.deposit_value || 0));
                }
            }
        }

        if (depositAmount > 0 && rules?.mp_access_token) {
            try {
                const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${rules.mp_access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        items: [{
                            id: newBooking.id,
                            title: `${realServiceName} - ${businessName}`,
                            quantity: 1,
                            unit_price: Number(depositAmount.toFixed(2)),
                            currency_id: 'MXN'
                        }],
                        external_reference: newBooking.id,
                        back_urls: {
                            success: `https://${data.tenant_id}.agendabarber.pro/book-success`,
                            failure: `https://${data.tenant_id}.agendabarber.pro/book-failure`,
                            pending: `https://${data.tenant_id}.agendabarber.pro/book-pending`
                        },
                        auto_return: 'approved',
                        binary_mode: true
                    })
                });
                const mpData = await mpResponse.json();
                if (mpData.init_point) paymentUrl = mpData.init_point;
            } catch (err) { console.error('MP ERROR:', err); }
        }
    }

    // 5. RACE CONDITION CHECK
    const { count: conflictCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', finalStaffId)
        .in('status', ['confirmed', 'seated', 'pending'])
        .neq('id', newBooking.id)
        .lt('start_time', endDate.toISOString())
        .gt('end_time', startDate.toISOString());

    if (conflictCount && conflictCount > 0) {
        await supabase.from('bookings').delete().eq('id', newBooking.id);
        return { success: false, error: 'Horario ocupado.' };
    }

    revalidatePath('/admin/pos');
    revalidatePath('/admin/schedule');
    revalidatePath('/app');

    return {
        success: true,
        payment_url: paymentUrl,
        deposit_amount: depositAmount,
        booking: {
            id: newBooking.id,
            guest_name: data.client_name,
            guest_email: data.client_email || null,
            guest_phone: data.client_phone || null,
            service_name: realServiceName,
            service_price: servicePrice,
            start_time: startDate.toISOString(),
            staff_name: realStaffName,
            date_formatted: dateStrFormatted,
            time_formatted: timeStrFormatted
        }
    };
}