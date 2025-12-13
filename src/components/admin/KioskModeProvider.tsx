'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { verifyKioskPin } from '@/app/admin/settings/actions'

// ============================================================
// KIOSK MODE PROVIDER - LocalStorage-Based State
// ============================================================
// 
// ARCHITECTURE CHANGE: Migrated from HttpOnly Cookie to LocalStorage
// 
// Why: The HttpOnly cookie was impossible to delete due to domain/path 
// mismatches in Vercel's serverless environment.
//
// New Approach:
// - Kiosk is ON by default (no token = kiosk active)
// - Kiosk is OFF when localStorage has 'kiosk_unlocked_token' = 'TRUE'
// - After 5 minutes of inactivity, the token is removed = kiosk returns ON
// ============================================================

// Auto-reactivation timeout: 5 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 300,000ms

// LocalStorage key for unlocked state
const KIOSK_UNLOCKED_KEY = 'kiosk_unlocked_token'

// ISOLATION: Only this email uses kiosk mode
const KIOSK_ENABLED_EMAIL = 'fulanosbarbermx@gmail.com'

interface KioskModeContextType {
    isKioskMode: boolean
    canToggleKioskMode: boolean
    isKioskEnabled: boolean
    activateKioskMode: () => void
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
            activateKioskMode: () => { },
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
    initialKioskMode?: boolean // Ignored now - state is from localStorage
}

export default function KioskModeProvider({
    children,
    userRole,
    userEmail = '',
    tenantId
}: Props) {
    // ========== EMAIL ISOLATION CHECK ==========
    const isKioskEnabled = userEmail.toLowerCase() === KIOSK_ENABLED_EMAIL.toLowerCase()

    // ========== STATE FROM LOCALSTORAGE ==========
    // Kiosk is ON by default (true), OFF only when unlocked token exists
    const [isKioskMode, setIsKioskMode] = useState(() => {
        if (!isKioskEnabled) return false
        if (typeof window === 'undefined') return true // SSR: assume locked
        const token = localStorage.getItem(KIOSK_UNLOCKED_KEY)
        return token !== 'TRUE' // If token exists and is TRUE, kiosk is OFF
    })

    // Track last activity time for auto-reactivation
    const lastActivityRef = useRef<number>(Date.now())

    // Only owner can toggle kiosk mode
    const canToggleKioskMode = isKioskEnabled && (userRole === 'owner' || userRole === 'super_admin')

    // ========== SYNC STATE ON CLIENT MOUNT ==========
    useEffect(() => {
        if (!isKioskEnabled) {
            setIsKioskMode(false)
            return
        }

        // Check localStorage on mount
        const token = localStorage.getItem(KIOSK_UNLOCKED_KEY)
        const unlocked = token === 'TRUE'
        setIsKioskMode(!unlocked) // If unlocked, kiosk is OFF

        console.log(`[KioskModeProvider] Mounted. Token: ${token}, isKioskMode: ${!unlocked}`)
    }, [isKioskEnabled])

    // ========== AUTO-REACTIVATION TIMER ==========
    // Only runs when kiosk is OFF (owner is viewing data)
    useEffect(() => {
        if (!isKioskEnabled) return
        if (isKioskMode) return // Only run when kiosk is OFF
        if (!canToggleKioskMode) return

        console.log(`[KioskModeProvider] Starting 5-minute inactivity timer`)

        // Update activity on user interaction
        const updateActivity = () => {
            lastActivityRef.current = Date.now()
        }

        const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
        events.forEach(event => {
            window.addEventListener(event, updateActivity, { passive: true })
        })

        // Check for inactivity every 30 seconds
        const checkInterval = setInterval(() => {
            const inactiveTime = Date.now() - lastActivityRef.current

            if (inactiveTime > INACTIVITY_TIMEOUT_MS) {
                console.log(`[KioskModeProvider] 5 minutes of inactivity. Re-activating kiosk...`)

                // Remove the unlocked token = kiosk turns ON
                localStorage.removeItem(KIOSK_UNLOCKED_KEY)

                // Force reload to apply new state
                window.location.reload()
            }
        }, 30000)

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, updateActivity)
            })
            clearInterval(checkInterval)
        }
    }, [isKioskMode, canToggleKioskMode, isKioskEnabled])

    // ========== ACTIVATE KIOSK (Remove unlock token) ==========
    const activateKioskMode = useCallback(() => {
        if (!isKioskEnabled) return

        console.log(`[KioskModeProvider] Activating kiosk mode`)
        localStorage.removeItem(KIOSK_UNLOCKED_KEY)
        setIsKioskMode(true)
    }, [isKioskEnabled])

    // ========== DEACTIVATE KIOSK (Add unlock token after PIN) ==========
    const deactivateKioskMode = useCallback(async (pin: string): Promise<boolean> => {
        if (!isKioskEnabled) return false

        console.log(`[KioskModeProvider] Attempting to deactivate kiosk with PIN...`)

        try {
            // Verify PIN via server action
            const result = await verifyKioskPin(pin, tenantId)

            if (!result.valid) {
                console.log(`[KioskModeProvider] PIN verification failed`)
                return false
            }

            console.log(`[KioskModeProvider] PIN verified. Setting unlock token...`)

            // Set the unlock token in localStorage
            localStorage.setItem(KIOSK_UNLOCKED_KEY, 'TRUE')

            // Update state
            setIsKioskMode(false)

            // Reset activity timer
            lastActivityRef.current = Date.now()

            return true
        } catch (error) {
            console.error(`[KioskModeProvider] Error verifying PIN:`, error)
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
