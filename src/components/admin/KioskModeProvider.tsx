'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { setKioskModeCookie, clearKioskModeCookie } from '@/app/admin/settings/actions'
import { useRouter, useSearchParams } from 'next/navigation'

// ============================================================
// KIOSK MODE PROVIDER - Complete Rebuild
// ============================================================
// Security Features:
// 1. Email Isolation: ONLY fulanosbarbermx@gmail.com is affected
// 2. PIN from Database: Read from tenants.kiosk_pin
// 3. Client-side deactivation with 1s delay
// 4. Auto-reactivation after 5 minutes of inactivity
// ============================================================

// Auto-reactivation timeout: 5 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 300,000ms

// Grace period after deactivation before timer starts: 2 minutes
const GRACE_PERIOD_MS = 2 * 60 * 1000 // 120,000ms

// ISOLATION: Only this email uses kiosk mode
// Super Admins and other tenants are NEVER affected
const KIOSK_ENABLED_EMAIL = 'fulanosbarbermx@gmail.com'

interface KioskModeContextType {
    isKioskMode: boolean
    canToggleKioskMode: boolean
    isKioskEnabled: boolean
    activateKioskMode: () => Promise<void>
    deactivateKioskMode: (pin: string) => Promise<boolean>
}

const KioskModeContext = createContext<KioskModeContextType | null>(null)

export function useKioskMode() {
    const ctx = useContext(KioskModeContext)
    if (!ctx) {
        return {
            isKioskMode: false,
            canToggleKioskMode: false,
            isKioskEnabled: false,
            activateKioskMode: async () => { },
            deactivateKioskMode: async () => false
        }
    }
    return ctx
}

interface Props {
    children: ReactNode
    userRole: string
    userEmail?: string
    tenantId: string
    initialKioskMode?: boolean
}

export default function KioskModeProvider({
    children,
    userRole,
    userEmail = '',
    tenantId,
    initialKioskMode = false
}: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // ========== EMAIL ISOLATION CHECK ==========
    // If user email is NOT fulanosbarbermx@gmail.com, ALL kiosk logic is disabled
    const isKioskEnabled = userEmail.toLowerCase() === KIOSK_ENABLED_EMAIL.toLowerCase()

    // If not enabled, force everything to false and don't initialize anything
    const [isKioskMode, setIsKioskMode] = useState(isKioskEnabled ? initialKioskMode : false)

    // Track last activity time for auto-reactivation
    const lastActivityRef = useRef<number>(Date.now())

    // Track deactivation time for grace period
    const deactivatedAtRef = useRef<number | null>(null)

    // Only owner can toggle kiosk mode, and only if enabled
    const canToggleKioskMode = isKioskEnabled && (userRole === 'owner' || userRole === 'super_admin')

    // Detect if we just deactivated (URL has kiosk_disabled param)
    useEffect(() => {
        if (!isKioskEnabled) return

        const kioskDisabled = searchParams.get('kiosk_disabled') || searchParams.get('kiosk_reset_final')
        if (kioskDisabled) {
            console.log('[KioskModeProvider] Detected kiosk_disabled param, setting grace period')
            deactivatedAtRef.current = Date.now()
            lastActivityRef.current = Date.now()
        }
    }, [searchParams, isKioskEnabled])

    // Sync with server state on mount
    useEffect(() => {
        if (isKioskEnabled) {
            setIsKioskMode(initialKioskMode)
        } else {
            setIsKioskMode(false)
        }
    }, [initialKioskMode, isKioskEnabled])

    // ========== AUTO-REACTIVATION TIMER ==========
    // Only runs for fulanosbarbermx@gmail.com when kiosk is OFF
    useEffect(() => {
        // ISOLATION: Skip if not enabled
        if (!isKioskEnabled) return

        // Only run if kiosk mode is OFF and user can toggle it
        if (isKioskMode || !canToggleKioskMode) return

        console.log('[KioskModeProvider] Auto-reactivation timer initialized for', userEmail)

        // Update last activity timestamp on user interaction
        const updateActivity = () => {
            lastActivityRef.current = Date.now()
        }

        // Listen for user interactions
        const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
        events.forEach(event => {
            window.addEventListener(event, updateActivity, { passive: true })
        })

        // Check for inactivity every 30 seconds
        const checkInterval = setInterval(async () => {
            // Check grace period first
            if (deactivatedAtRef.current) {
                const timeSinceDeactivation = Date.now() - deactivatedAtRef.current
                if (timeSinceDeactivation < GRACE_PERIOD_MS) {
                    console.log('[KioskModeProvider] Still in grace period, skipping check')
                    return
                }
            }

            const inactiveTime = Date.now() - lastActivityRef.current

            if (inactiveTime > INACTIVITY_TIMEOUT_MS) {
                console.log('[KioskModeProvider] 5 minutes of inactivity detected. Auto-activating kiosk mode...')

                try {
                    const result = await setKioskModeCookie(tenantId)
                    if (result.success) {
                        // Force reload to require PIN again
                        window.location.href = '/admin?kiosk_timeout=1'
                    }
                } catch (error) {
                    console.error('[KioskModeProvider] Error auto-activating kiosk mode:', error)
                }
            }
        }, 30000) // Check every 30 seconds

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, updateActivity)
            })
            clearInterval(checkInterval)
        }
    }, [isKioskMode, canToggleKioskMode, tenantId, isKioskEnabled, userEmail])

    const activateKioskMode = useCallback(async () => {
        if (!isKioskEnabled) return

        try {
            const result = await setKioskModeCookie(tenantId)
            if (result.success) {
                setIsKioskMode(true)
                deactivatedAtRef.current = null // Clear grace period
                router.refresh()
            }
        } catch (error) {
            console.error('[KioskModeProvider] Error activating kiosk mode:', error)
        }
    }, [tenantId, router, isKioskEnabled])

    const deactivateKioskMode = useCallback(async (pin: string): Promise<boolean> => {
        if (!isKioskEnabled) return false

        try {
            // Server action verifies PIN and deletes cookie
            const result = await clearKioskModeCookie(pin, tenantId)
            if (result.success) {
                setIsKioskMode(false)
                lastActivityRef.current = Date.now()
                deactivatedAtRef.current = Date.now() // Start grace period
                return true
            }
            return false
        } catch (error) {
            console.error('[KioskModeProvider] Error deactivating kiosk mode:', error)
            return false
        }
    }, [tenantId, isKioskEnabled])

    return (
        <KioskModeContext.Provider value={{
            isKioskMode: isKioskEnabled ? isKioskMode : false,
            canToggleKioskMode,
            isKioskEnabled,
            activateKioskMode,
            deactivateKioskMode
        }}>
            {children}
        </KioskModeContext.Provider>
    )
}
