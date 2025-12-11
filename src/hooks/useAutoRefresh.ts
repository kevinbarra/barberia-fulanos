'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useAutoRefresh() {
    const router = useRouter()

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[AUTO-REFRESH] App became visible, refreshing data...')
                router.refresh()
            }
        }

        // Listen for visibility changes (tab switch, phone unlock)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Also listen for focus (window click)
        window.addEventListener('focus', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleVisibilityChange)
        }
    }, [router])
}
