import { createAdminClient } from '@/utils/supabase/admin';
import { isBefore, subMinutes } from 'date-fns';

/**
 * Cron: Auto-Complete Bookings (Agile Mode)
 * 
 * Runs every 5 minutes via Vercel Cron.
 * Finds bookings where:
 *   - tenant has workflow_mode = 'auto'
 *   - booking status is 'confirmed' or 'seated'
 *   - end_time + 15 min < NOW
 *   - no existing transaction linked to booking_id
 *
 * Creates a silent transaction (cash, price_at_booking) and marks completed.
 */
export async function GET(request: Request) {
    // Verify Vercel Cron auth
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }
    }

    const supabase = createAdminClient();

    // 1. Find all tenants with workflow_mode = 'auto'
    const { data: autoTenants, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, settings')
        .eq('subscription_status', 'active');

    if (tenantError) {
        console.error('[AUTO-COMPLETE] Error fetching tenants:', tenantError);
        return Response.json({ error: tenantError.message }, { status: 500 });
    }

    const agileTenantsIds = (autoTenants || [])
        .filter(t => {
            const settings = t.settings as Record<string, any> | null;
            return settings?.workflow_mode === 'auto';
        })
        .map(t => t.id);

    if (agileTenantsIds.length === 0) {
        return Response.json({ message: 'No agile tenants', processed: 0 });
    }

    // 2. Find eligible bookings: end_time + 15 min < NOW
    const threshold = subMinutes(new Date(), 15).toISOString();

    const { data: eligibleBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, tenant_id, staff_id, customer_id, service_id, start_time, end_time, price_at_booking, service_name_at_booking, status')
        .in('tenant_id', agileTenantsIds)
        .in('status', ['confirmed', 'seated'])
        .lt('end_time', threshold);

    if (bookingsError) {
        console.error('[AUTO-COMPLETE] Error fetching bookings:', bookingsError);
        return Response.json({ error: bookingsError.message }, { status: 500 });
    }

    if (!eligibleBookings || eligibleBookings.length === 0) {
        return Response.json({ message: 'No bookings to auto-complete', processed: 0 });
    }

    let processed = 0;
    let skipped = 0;
    const results: { bookingId: string; success: boolean; reason?: string }[] = [];

    for (const booking of eligibleBookings) {
        // DUPLICATE GUARD: Check if transaction already exists for this booking
        const { count: existingTx } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('booking_id', booking.id);

        if (existingTx && existingTx > 0) {
            // Already has a transaction — just mark completed if not already
            if (booking.status !== 'completed') {
                await supabase
                    .from('bookings')
                    .update({ status: 'completed', notes: 'Auto-completado (ya cobrado)' })
                    .eq('id', booking.id);
            }
            skipped++;
            results.push({ bookingId: booking.id, success: true, reason: 'already_charged' });
            continue;
        }

        // Skip bookings without price/service data
        if (!booking.service_id || !booking.price_at_booking || booking.price_at_booking <= 0) {
            results.push({ bookingId: booking.id, success: false, reason: 'no_price_data' });
            skipped++;
            continue;
        }

        try {
            // Create atomic transaction silently
            const { data: transactionId, error: txError } = await supabase.rpc('agile_checkout_atomic', {
                p_booking_id: booking.id,
                p_client_id: booking.customer_id,
                p_total: booking.price_at_booking,
                p_services: [{ id: booking.service_id, price: booking.price_at_booking }],
                p_products: [],
                p_payment_method: 'cash',
                p_barber_id: booking.staff_id,
                p_points_redeemed: 0,
                p_reward_id: null
            });

            if (txError) throw txError;

            // Link booking_id + back-date if past
            if (transactionId) {
                const txUpdate: Record<string, any> = { booking_id: booking.id };
                const bookingDate = new Date(booking.start_time);
                if (isBefore(bookingDate, new Date())) {
                    txUpdate.created_at = booking.start_time;
                }
                await supabase.from('transactions').update(txUpdate).eq('id', transactionId);
            }

            // Mark booking as completed with auto-complete flag
            await supabase
                .from('bookings')
                .update({
                    status: 'completed',
                    notes: `Auto-completado | $${booking.price_at_booking} | Efectivo`
                })
                .eq('id', booking.id);

            processed++;
            results.push({ bookingId: booking.id, success: true });

        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[AUTO-COMPLETE] Error processing booking ${booking.id}:`, msg);
            results.push({ bookingId: booking.id, success: false, reason: msg });
        }
    }

    console.log(`[AUTO-COMPLETE] Processed: ${processed}, Skipped: ${skipped}, Total: ${eligibleBookings.length}`);

    return Response.json({
        message: 'Auto-complete cycle done',
        processed,
        skipped,
        total: eligibleBookings.length,
        results
    });
}
