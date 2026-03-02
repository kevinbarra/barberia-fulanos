'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

/**
 * Hook that subscribes to realtime updates for client's loyalty points.
 * Listens to the `transactions` table for new records where client_id matches.
 * When a POS transaction is created, the page refreshes and server-side
 * recalculates tenant-specific points from getMyLoyaltyStatus.
 */
export function useRealtimePoints(userId: string, initialPoints: number) {
    const [points, setPoints] = useState(initialPoints);
    const router = useRouter();

    // Keep points in sync with server-driven initial value
    useEffect(() => {
        setPoints(initialPoints);
    }, [initialPoints]);

    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Subscribe to new transactions for this client
        // When staff finalizes a ticket or scans QR, points change
        const channel = supabase
            .channel(`client-transactions-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'transactions',
                    filter: `client_id=eq.${userId}`
                },
                (payload) => {
                    console.log('[REALTIME] New transaction for client:', payload);
                    // Force refresh — server component will recalculate tenant-specific points
                    router.refresh();
                }
            )
            .subscribe((status) => {
                console.log('[REALTIME] Points subscription:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, router]);

    return points;
}

