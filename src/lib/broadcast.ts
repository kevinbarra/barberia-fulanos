'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export type BookingEvent =
    | 'new-booking'
    | 'booking-cancelled'
    | 'booking-completed'
    | 'booking-seated'
    | 'booking-noshow'
    | 'booking-updated'

export interface BookingBroadcastPayload {
    id: string
    clientName?: string
    serviceName?: string
    staffName?: string
    time?: string
    date?: string
    status?: string
    start_time?: string
    end_time?: string
}

/**
 * Sends a real-time broadcast notification to admin clients for a specific tenant.
 * This bypasses RLS and works for any booking event.
 * 
 * @param tenantId - The tenant to broadcast to
 * @param event - The type of booking event
 * @param payload - The booking data to send
 */
export async function broadcastBookingEvent(
    tenantId: string,
    event: BookingEvent,
    payload: BookingBroadcastPayload
): Promise<void> {
    try {
        const supabase = createAdminClient()
        const channel = supabase.channel(`booking-notifications-${tenantId}`)

        await channel.send({
            type: 'broadcast',
            event,
            payload
        })

        console.log(`[BROADCAST] Sent ${event} to tenant ${tenantId.slice(0, 8)}...`)
    } catch (error) {
        // Non-blocking - log but don't fail the main operation
        console.warn('[BROADCAST] Failed to send (non-critical):', error)
    }
}
