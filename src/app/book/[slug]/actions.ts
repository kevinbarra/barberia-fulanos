'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendBookingEmail, sendStaffNewBookingNotification } from '@/lib/email'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { revalidatePath } from 'next/cache'
import { DEFAULT_TIMEZONE } from '@/lib/constants';

const TIMEZONE = DEFAULT_TIMEZONE;

// ─── SAFE JSONB PARSER ────────────────────────────────────────────
function safeParseRecurrenceRule(raw: any): { type?: string; days?: string[]; until?: string } | null {
    try {
        if (!raw) return null;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null; // Malformed JSONB → skip, never crash
    }
}

// ─── TIMEZONE-SAFE TIME PROJECTION ────────────────────────────────
// Extracts HH:MM:SS from a UTC timestamp in the target timezone,
// using date-fns-tz (reliable in Node.js, unlike toLocaleTimeString)
function projectTimeOntoDate(utcTimestamp: string, targetDateStr: string): Date {
    const zoned = toZonedTime(new Date(utcTimestamp), TIMEZONE);
    const hh = zoned.getHours().toString().padStart(2, '0');
    const mm = zoned.getMinutes().toString().padStart(2, '0');
    const ss = zoned.getSeconds().toString().padStart(2, '0');
    return fromZonedTime(`${targetDateStr} ${hh}:${mm}:${ss}`, TIMEZONE);
}

// ─── getTakenRanges: MERGED RANGES ENGINE ─────────────────────────
// Returns a SINGLE unified array of busy ranges from 3 sources:
//   1. Confirmed bookings
//   2. One-off time blocks
//   3. Recurrent time blocks (matched by day name from recurrence_rule)
// A parsing error in ANY block is logged and skipped — never crashes.
export async function getTakenRanges(staffId: string, dateStr: string) {
    try {
        const supabase = await createClient()

        const startOfDay = fromZonedTime(`${dateStr} 00:00:00`, TIMEZONE).toISOString()
        const endOfDay = fromZonedTime(`${dateStr} 23:59:59`, TIMEZONE).toISOString()

        // ── LAYER 1: Confirmed bookings ──
        const { data: bookings, error: bErr } = await supabase
            .from('bookings')
            .select('start_time, end_time')
            .eq('staff_id', staffId)
            .in('status', ['confirmed', 'seated', 'completed'])
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)

        if (bErr) console.error('[getTakenRanges] Bookings query failed:', bErr.message);

        // ── LAYER 2: One-off time blocks for this date ──
        const { data: allBlocks, error: blkErr } = await supabase
            .from('time_blocks')
            .select('start_time, end_time, is_recurrent')
            .eq('staff_id', staffId)
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)

        if (blkErr) console.error('[getTakenRanges] Blocks query failed:', blkErr.message);

        // Filter: only non-recurrent (is_recurrent = false OR null for legacy data)
        const oneOffBlocks = (allBlocks || []).filter(b => !b.is_recurrent);

        // ── LAYER 3: Recurrent time blocks (no date filter) ──
        const { data: recurrentBlocks, error: recErr } = await supabase
            .from('time_blocks')
            .select('start_time, end_time, recurrence_rule')
            .eq('staff_id', staffId)
            .eq('is_recurrent', true)

        if (recErr) console.error('[getTakenRanges] Recurrent blocks query failed:', recErr.message);

        // ── MERGE: Start with bookings + one-off blocks ──
        const busyRanges: { start: number; end: number }[] = [
            ...(bookings || []),
            ...oneOffBlocks
        ].map(item => ({
            start: new Date(item.start_time).getTime(),
            end: new Date(item.end_time).getTime()
        }));

        // ── MERGE: Add matching recurrent blocks ──
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const requestedDate = new Date(dateStr + 'T12:00:00');
        const requestedDayName = dayNames[requestedDate.getDay()];

        for (const block of (recurrentBlocks || [])) {
            const rule = safeParseRecurrenceRule(block.recurrence_rule);
            if (!rule) continue;

            // Expired?
            if (rule.until && new Date(rule.until) < requestedDate) continue;

            let matches = false;
            if (rule.type === 'daily') {
                matches = true;
            } else if (rule.type === 'weekly') {
                matches = Array.isArray(rule.days) && rule.days.includes(requestedDayName);
            }

            if (matches) {
                const projectedStart = projectTimeOntoDate(block.start_time, dateStr);
                const projectedEnd = projectTimeOntoDate(block.end_time, dateStr);

                busyRanges.push({
                    start: projectedStart.getTime(),
                    end: projectedEnd.getTime()
                });
            }
        }

        return busyRanges;

    } catch (err) {
        console.error('[getTakenRanges] CRITICAL UNHANDLED ERROR:', err);
        return []; // Degrade gracefully: show all slots rather than crash
    }
}

// ─── createBooking: HARDENED SERVER ACTION ─────────────────────────
export async function createBooking(data: {
    tenant_id: string;
    service_id: string;
    staff_id: string;
    start_time: string;
    client_name: string;
    client_phone: string;
    client_email: string;
    duration_min: number;
    customer_id?: string | null;
    origin?: string;
    is_any_staff?: boolean;
    available_staff_ids?: string[];
}) {
    try {
        const supabase = await createClient()

        // ── INPUT VALIDATION ──
        const trimmedName = (data.client_name || '').trim();
        const trimmedPhone = (data.client_phone || '').replace(/\D/g, '');

        if (!trimmedName) return { success: false, error: 'El nombre del cliente es obligatorio.' };
        if (trimmedPhone.length < 10) return { success: false, error: 'El teléfono debe tener al menos 10 dígitos.' };
        if (!data.service_id || !data.staff_id || !data.start_time || !data.tenant_id) {
            return { success: false, error: 'Faltan datos requeridos para la reserva.' };
        }
        if (!data.duration_min || data.duration_min < 1) {
            return { success: false, error: 'Duración de servicio inválida.' };
        }

        // 1. Fetch service & tenant
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

        // ── LOAD BALANCER (Any Staff) ──
        // Uses getTakenRanges (all 3 layers) to find the truly free barber
        let finalStaffId = data.staff_id;
        if (data.is_any_staff && data.available_staff_ids && data.available_staff_ids.length > 0) {
            const dateStr = data.start_time.split('T')[0];
            const startTime = fromZonedTime(data.start_time, TIMEZONE);
            const endTime = new Date(startTime.getTime() + data.duration_min * 60000);
            const slotStart = startTime.getTime();
            const slotEnd = endTime.getTime();

            // For each available staff, get their FULL busy ranges (bookings + all blocks)
            const staffAvailability: { id: string; bookingCount: number; isFree: boolean }[] = [];

            await Promise.all(data.available_staff_ids.map(async (staffId) => {
                const ranges = await getTakenRanges(staffId, dateStr);
                const hasConflict = ranges.some(r => slotStart < r.end && slotEnd > r.start);
                
                // Count bookings for load balancing among free staff
                const bookingRangesCount = ranges.length; // approximate
                staffAvailability.push({ id: staffId, bookingCount: bookingRangesCount, isFree: !hasConflict });
            }));

            // Pick the free staff with the fewest existing bookings
            const freeStaff = staffAvailability.filter(s => s.isFree);
            if (freeStaff.length > 0) {
                freeStaff.sort((a, b) => a.bookingCount - b.bookingCount);
                finalStaffId = freeStaff[0].id;
            } else {
                return { success: false, error: 'No hay barberos disponibles en ese horario.' };
            }
        }

        // ── STAFF INFO ──
        let realStaffName = "El equipo";
        let realStaffPhone: string | null = null;
        try {
            const adminClient = createAdminClient();
            const { data: staffData } = await adminClient
                .from('profiles')
                .select('full_name, phone')
                .eq('id', finalStaffId)
                .single();
            if (staffData) {
                realStaffName = staffData.full_name || "El equipo";
                realStaffPhone = staffData.phone || null;
            }
        } catch (e) { console.error('[createBooking] Staff lookup failed:', e); }

        // 2. TIMEZONE
        const startDate = fromZonedTime(data.start_time, TIMEZONE);
        const endDate = new Date(startDate.getTime() + data.duration_min * 60000);

        const dateStrFormatted = startDate.toLocaleDateString('es-MX', { timeZone: TIMEZONE, weekday: 'long', day: 'numeric', month: 'long' });
        const timeStrFormatted = startDate.toLocaleTimeString('es-MX', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });

        // ── CONCURRENCY GUARD (Pre-Insert) ──
        // Check the slot is STILL free right before inserting
        const dateStrRaw = data.start_time.split('T')[0];
        const preCheckRanges = await getTakenRanges(finalStaffId, dateStrRaw);
        const slotStartMs = startDate.getTime();
        const slotEndMs = endDate.getTime();
        const slotTaken = preCheckRanges.some(r => slotStartMs < r.end && slotEndMs > r.start);

        if (slotTaken) {
            return { success: false, error: 'Este horario se acaba de ocupar. Elige otro.' };
        }

        // 3. INSERT
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
            guest_name: trimmedName,
            guest_phone: trimmedPhone,
            guest_email: data.client_email || null,
            customer_id: data.customer_id || null,
            notes: `Cliente: ${trimmedName} | Tel: ${trimmedPhone} | Email: ${data.client_email || 'N/A'}`
        };

        const { data: newBooking, error: insertError } = await supabase
            .from('bookings')
            .insert(insertPayload)
            .select('id')
            .single();

        if (insertError) {
            console.error('[createBooking] Insert failed:', insertError.message);
            if (insertError.message?.includes('no_double_booking')) {
                return { success: false, error: 'Ese horario se ocupó. Elige otro.' };
            }
            return { success: false, error: 'Error al reservar: ' + (insertError.message || 'desconocido') };
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
                } catch (err) { console.error('[createBooking] MP ERROR:', err); }
            }
        }

        // 5. POST-INSERT RACE CONDITION CHECK
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
            return { success: false, error: 'Horario ocupado por otra reserva simultánea.' };
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
                guest_name: trimmedName,
                guest_email: data.client_email || null,
                guest_phone: trimmedPhone || null,
                service_name: realServiceName,
                service_price: servicePrice,
                start_time: startDate.toISOString(),
                staff_name: realStaffName,
                staff_phone: realStaffPhone,
                date_formatted: dateStrFormatted,
                time_formatted: timeStrFormatted
            }
        };

    } catch (err) {
        console.error('[createBooking] UNHANDLED ERROR:', err);
        return { success: false, error: 'Error inesperado al procesar la reserva. Intenta de nuevo.' };
    }
}