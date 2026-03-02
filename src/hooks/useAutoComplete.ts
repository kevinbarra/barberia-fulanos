'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side complement to the auto-complete cron.
 * Polls a server action every 60s to auto-complete expired bookings
 * for the current tenant. Only active when workflowMode === 'auto'.
 */
export function useAutoComplete(tenantId: string, workflowMode: 'auto' | 'manual') {
    const router = useRouter();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (workflowMode !== 'auto') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        const pollAutoComplete = async () => {
            try {
                const res = await fetch('/api/cron/auto-complete', {
                    method: 'GET',
                    headers: { 'x-client-poll': 'true' }
                });
                const data = await res.json();
                if (data.processed > 0) {
                    console.log(`[AUTO-COMPLETE] Client poll: ${data.processed} bookings completed`);
                    router.refresh();
                }
            } catch (err) {
                // Silent failure — cron is the primary mechanism
                console.debug('[AUTO-COMPLETE] Poll error:', err);
            }
        };

        // Initial check after 5s
        const initTimeout = setTimeout(pollAutoComplete, 5000);

        // Then every 60s
        intervalRef.current = setInterval(pollAutoComplete, 60000);

        return () => {
            clearTimeout(initTimeout);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [tenantId, workflowMode, router]);
}
