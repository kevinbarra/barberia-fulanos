'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { verifyKioskPin } from '@/app/admin/settings/actions'
import { MASTER_ADMIN_EMAIL } from '@/lib/constants'

// ============================================================
// KIOSK MODE PROVIDER - LocalStorage-Based State
// ============================================================

// Auto-reactivation timeout: 5 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 300,000ms

// LocalStorage key for unlocked state
const KIOSK_UNLOCKED_KEY = 'kiosk_unlocked_token'

// TODO: Migrate this email-based feature gate to role-based permissions
// This should be replaced with a has_kiosk_access flag in profiles or tenants table
const KIOSK_ENABLED_EMAIL = MASTER_ADMIN_EMAIL

interface KioskModeContextType {
    isKioskMode: boolean
    isLoading: boolean  // NEW: Loading state to prevent flash
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
            isLoading: true,  // Default to loading for SSR safety
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
}

export default function KioskModeProvider({
    children,
    userRole,
    userEmail = '',
    tenantId
}: Props) {
    // ========== EMAIL ISOLATION CHECK ==========
    const isKioskEnabled = userEmail.toLowerCase() === KIOSK_ENABLED_EMAIL.toLowerCase()

    // ========== LOADING STATE TO PREVENT FLASH ==========
    // Start with isLoading=true, isKioskMode=false (neutral state)
    // Only after reading localStorage do we set the actual state
    const [isLoading, setIsLoading] = useState(true)
    const [isKioskMode, setIsKioskMode] = useState(false)

    // Track last activity time for auto-reactivation
    const lastActivityRef = useRef<number>(Date.now())

    // Only owner can toggle kiosk mode
    const canToggleKioskMode = isKioskEnabled && (userRole === 'owner' || userRole === 'super_admin')

    // ========== SYNC STATE ON CLIENT MOUNT ==========
    useEffect(() => {
        if (!isKioskEnabled) {
            setIsKioskMode(false)
            setIsLoading(false)
            return
        }

        // Read localStorage to determine actual state
        const token = localStorage.getItem(KIOSK_UNLOCKED_KEY)
        const unlocked = token === 'TRUE'

        // Kiosk is ON when there's NO token
        setIsKioskMode(!unlocked)
        setIsLoading(false)  // Done loading

        console.log(`[KioskModeProvider] Mounted. Token: ${token}, isKioskMode: ${!unlocked}`)
    }, [isKioskEnabled])

    // ========== AUTO-REACTIVATION TIMER ==========
    // Only runs when kiosk is OFF (owner is viewing data)
    useEffect(() => {
        if (!isKioskEnabled) return
        if (isLoading) return  // Don't start timer while loading
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
    }, [isKioskMode, isLoading, canToggleKioskMode, isKioskEnabled])

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
            isLoading,
            canToggleKioskMode,
            isKioskEnabled,
            activateKioskMode,
            deactivateKioskMode
        }}>
            {children}
        </KioskModeContext.Provider>
    )
}
