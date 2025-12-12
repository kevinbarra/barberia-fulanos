'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

/**
 * Hook that subscribes to realtime updates for client's loyalty points.
 * When staff scans QR and assigns points, client screen updates immediately.
 */
export function useRealtimePoints(userId: string, initialPoints: number) {
    const [points, setPoints] = useState(initialPoints);
    const router = useRouter();

    useEffect(() => {
        // Create browser client for realtime subscriptions
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Subscribe to changes on this user's profile
        const channel = supabase
            .channel(`profile-points-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`
                },
                (payload) => {
                    console.log('[REALTIME] Profile updated:', payload);
                    const newPoints = payload.new?.loyalty_points;
                    if (typeof newPoints === 'number' && newPoints !== points) {
                        setPoints(newPoints);
                        // Force router refresh to update any server-fetched data too
                        router.refresh();
                    }
                }
            )
            .subscribe((status) => {
                console.log('[REALTIME] Subscription status:', status);
            });

        // Cleanup on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, points, router]);

    return points;
}
