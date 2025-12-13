'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { setKioskModeCookie, clearKioskModeCookie } from '@/app/admin/settings/actions'
import { useRouter } from 'next/navigation'

// ISOLATION: Only this email/tenant uses kiosk mode
// Super Admins and other tenants are NOT affected
const KIOSK_ENABLED_EMAIL = 'fulanosbarbermx@gmail.com'

interface KioskModeContextType {
    isKioskMode: boolean
    canToggleKioskMode: boolean
    isKioskEnabled: boolean  // Whether kiosk feature is available for this user
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
    userEmail?: string  // NEW: User email for isolation check
    tenantId: string
    initialKioskMode?: boolean // Server-side initial state from cookie
}

export default function KioskModeProvider({
    children,
    userRole,
    userEmail = '',
    tenantId,
    initialKioskMode = false
}: Props) {
    const router = useRouter()

    // ISOLATION CHECK: Only enable kiosk for the specific email/tenant
    // Super Admins (kevinbarra2001@gmail.com) are NEVER affected by kiosk mode
    const isKioskEnabled = userEmail.toLowerCase() === KIOSK_ENABLED_EMAIL.toLowerCase()

    // If kiosk is not enabled for this user, force isKioskMode to false
    const [isKioskMode, setIsKioskMode] = useState(isKioskEnabled ? initialKioskMode : false)

    // Only owner and super_admin can toggle kiosk mode
    // But only if kiosk is enabled for their email
    const canToggleKioskMode = isKioskEnabled && (userRole === 'owner' || userRole === 'super_admin')

    // Sync with server state on mount (for client-side navigation)
    // But only if kiosk is enabled for this user
    useEffect(() => {
        if (isKioskEnabled) {
            setIsKioskMode(initialKioskMode)
        } else {
            setIsKioskMode(false)
        }
    }, [initialKioskMode, isKioskEnabled])

    // ========== AUTO-REACTIVATION LOGIC - DISABLED ==========
    // TODO: Re-enable after kiosk system is stable
    // The auto-reactivation was causing the "zombie kiosk" bug because
    // it was re-activating kiosk mode before the user could interact
    // 
    // When we re-enable, we need:
    // 1. A grace period after deactivation (e.g., skip first 2 minutes)
    // 2. Detection of ?kiosk_disabled= in URL to pause timer
    // 3. Better activity tracking
    //
    // For now, kiosk mode ONLY activates via:
    // - Manual toggle in settings
    // - Stays active until manually deactivated

    const activateKioskMode = useCallback(async () => {
        // ISOLATION: Block if not enabled
        if (!isKioskEnabled) return

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
    }, [tenantId, router, isKioskEnabled])

    const deactivateKioskMode = useCallback(async (pin: string): Promise<boolean> => {
        // ISOLATION: Block if not enabled
        if (!isKioskEnabled) return false

        try {
            const result = await clearKioskModeCookie(pin, tenantId)
            if (result.success) {
                // Update local state
                setIsKioskMode(false)
                return true
            }
            return false
        } catch (error) {
            console.error('Error deactivating kiosk mode:', error)
            return false
        }
    }, [tenantId, isKioskEnabled])

    return (
        <KioskModeContext.Provider value={{
            isKioskMode: isKioskEnabled ? isKioskMode : false,  // Force false if not enabled
            canToggleKioskMode,
            isKioskEnabled,
            activateKioskMode,
            deactivateKioskMode
        }}>
            {children}
        </KioskModeContext.Provider>
    )
}
