import { createAdminClient } from '@/utils/supabase/admin';
import { subMinutes } from 'date-fns';

/**
 * Cron: Payment Cleanup
 * 
 * Runs every 15 minutes via Vercel Cron.
 * Finds bookings where:
 *   - payment_status is 'pending_payment'
 *   - created_at < 15 minutes ago
 *
 * Deletes these bookings to release the scheduled slots.
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

    // 1. Threshold: 15 minutes ago
    const threshold = subMinutes(new Date(), 15).toISOString();

    // 2. Find stale pending bookings
    const { data: staleBookings, error: fetchError } = await supabase
        .from('bookings')
        .select('id, client_name:notes') // Simplified select
        .eq('payment_status', 'pending_payment')
        .lt('created_at', threshold);

    if (fetchError) {
        console.error('[PAYMENT-CLEANUP] Error fetching stale bookings:', fetchError);
        return Response.json({ error: fetchError.message }, { status: 500 });
    }

    if (!staleBookings || staleBookings.length === 0) {
        return Response.json({ message: 'No stale bookings found', deleted: 0 });
    }

    // 3. Delete them
    const idsToDelete = staleBookings.map(b => b.id);
    const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) {
        console.error('[PAYMENT-CLEANUP] Error deleting bookings:', deleteError);
        return Response.json({ error: deleteError.message }, { status: 500 });
    }

    console.log(`[PAYMENT-CLEANUP] Deleted ${idsToDelete.length} stale pending bookings.`);

    return Response.json({
        message: 'Cleanup cycle complete',
        deleted: idsToDelete.length,
        ids: idsToDelete
    });
}
