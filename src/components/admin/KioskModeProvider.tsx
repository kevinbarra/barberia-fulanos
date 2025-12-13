'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { setKioskModeCookie, clearKioskModeCookie } from '@/app/admin/settings/actions'
import { useRouter } from 'next/navigation'

// Auto-reactivation timeout: 5 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 300,000ms

interface KioskModeContextType {
    isKioskMode: boolean
    canToggleKioskMode: boolean
    activateKioskMode: () => Promise<void>
    deactivateKioskMode: (pin: string) => Promise<boolean>
}

const KioskModeContext = createContext<KioskModeContextType | null>(null)

export function useKioskMode() {
    const ctx = useContext(KioskModeContext)
    if (!ctx) {
        // Return default values if not within provider (for SSR safety)
        return {
            isKioskMode: false,
            canToggleKioskMode: false,
            activateKioskMode: async () => { },
            deactivateKioskMode: async () => false
        }
    }
    return ctx
}

interface Props {
    children: ReactNode
    userRole: string
    tenantId: string
    initialKioskMode?: boolean // Server-side initial state from cookie
}

export default function KioskModeProvider({
    children,
    userRole,
    tenantId,
    initialKioskMode = false
}: Props) {
    const [isKioskMode, setIsKioskMode] = useState(initialKioskMode)
    const router = useRouter()

    // Track last activity time for auto-reactivation
    const lastActivityRef = useRef<number>(Date.now())

    // Only owner and super_admin can toggle kiosk mode
    const canToggleKioskMode = userRole === 'owner' || userRole === 'super_admin'

    // Sync with server state on mount (for client-side navigation)
    useEffect(() => {
        setIsKioskMode(initialKioskMode)
    }, [initialKioskMode])

    // ========== AUTO-REACTIVATION LOGIC ==========
    // When kiosk mode is OFF (owner viewing data), track inactivity
    // and auto-reactivate after 5 minutes
    useEffect(() => {
        // Only run if kiosk mode is OFF and user can toggle it
        if (isKioskMode || !canToggleKioskMode) return

        console.log('[KioskModeProvider] Auto-reactivation timer started (5min)')

        // Update last activity timestamp on user interaction
        const updateActivity = () => {
            lastActivityRef.current = Date.now()
        }

        // Listen for any user interaction
        const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
        events.forEach(event => {
            window.addEventListener(event, updateActivity, { passive: true })
        })

        // Check for inactivity every 30 seconds
        const checkInterval = setInterval(async () => {
            const inactiveTime = Date.now() - lastActivityRef.current

            if (inactiveTime > INACTIVITY_TIMEOUT_MS) {
                console.log('[KioskModeProvider] 5 minutes of inactivity detected. Auto-activating kiosk mode...')

                // Activate kiosk mode via server action
                try {
                    const result = await setKioskModeCookie(tenantId)
                    if (result.success) {
                        // Force reload to ensure PIN is required to access again
                        window.location.href = '/admin?kiosk_timeout=1'
                    }
                } catch (error) {
                    console.error('Error auto-activating kiosk mode:', error)
                }
            }
        }, 30000) // Check every 30 seconds

        return () => {
            // Cleanup listeners
            events.forEach(event => {
                window.removeEventListener(event, updateActivity)
            })
            clearInterval(checkInterval)
        }
    }, [isKioskMode, canToggleKioskMode, tenantId])

    const activateKioskMode = useCallback(async () => {
        try {
            const result = await setKioskModeCookie(tenantId)
            if (result.success) {
                setIsKioskMode(true)
                // Refresh to update server components
                router.refresh()
            }
        } catch (error) {
            console.error('Error activating kiosk mode:', error)
        }
    }, [tenantId, router])

    const deactivateKioskMode = useCallback(async (pin: string): Promise<boolean> => {
        try {
            const result = await clearKioskModeCookie(pin, tenantId)
            if (result.success) {
                // First, update local state
                setIsKioskMode(false)
                // Reset activity timer on successful deactivation
                lastActivityRef.current = Date.now()
                return true
            }
            return false
        } catch (error) {
            console.error('Error deactivating kiosk mode:', error)
            return false
        }
    }, [tenantId])

    return (
        <KioskModeContext.Provider value={{
            isKioskMode,
            canToggleKioskMode,
            activateKioskMode,
            deactivateKioskMode
        }}>
            {children}
        </KioskModeContext.Provider>
    )
}
