'use client';

import { useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

interface UseRealtimeBookingsOptions {
    // For clients: listen to their own bookings
    customerId?: string;
    // For staff: listen to tenant bookings
    tenantId?: string;
    // Optional callback when update occurs
    onUpdate?: () => void;
}

/**
 * Hook that subscribes to realtime updates for bookings.
 * When booking status changes (completed, no-show, cancelled), 
 * triggers automatic refresh of the page data.
 * 
 * Use cases:
 * - Client dashboard: See when their cita is marked as completed/no-show
 * - Admin POS: See new bookings as they come in
 */
export function useRealtimeBookings(options: UseRealtimeBookingsOptions) {
    const router = useRouter();
    const lastRefreshRef = useRef<number>(0);

    useEffect(() => {
        const { customerId, tenantId, onUpdate } = options;

        // Need at least one filter
        if (!customerId && !tenantId) return;

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Debounce refreshes to avoid overwhelming the server
        const triggerRefresh = () => {
            const now = Date.now();
            // Minimum 2 seconds between refreshes
            if (now - lastRefreshRef.current > 2000) {
                lastRefreshRef.current = now;
                console.log('[REALTIME] Booking change detected, refreshing...');
                router.refresh();
                onUpdate?.();
            }
        };

        // Build filter based on options
        // For customers: filter by customer_id
        // For tenants: filter by tenant_id
        const filter = customerId
            ? `customer_id=eq.${customerId}`
            : `tenant_id=eq.${tenantId}`;

        const channelName = customerId
            ? `bookings-customer-${customerId}`
            : `bookings-tenant-${tenantId}`;

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bookings',
                    filter: tenantId ? filter : undefined // INSERT for new bookings (admin)
                },
                (payload) => {
                    console.log('[REALTIME] New booking:', payload);
                    triggerRefresh();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bookings',
                    filter // UPDATE for status changes
                },
                (payload) => {
                    console.log('[REALTIME] Booking updated:', payload);
                    triggerRefresh();
                }
            )
            .subscribe((status) => {
                console.log('[REALTIME] Bookings subscription:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [options.customerId, options.tenantId, router, options.onUpdate]);
}
