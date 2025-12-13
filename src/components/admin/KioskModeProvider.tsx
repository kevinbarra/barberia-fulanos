'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { setKioskModeCookie, clearKioskModeCookie } from '@/app/admin/settings/actions'
import { useRouter } from 'next/navigation'

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

    // Only owner and super_admin can toggle kiosk mode
    const canToggleKioskMode = userRole === 'owner' || userRole === 'super_admin'

    // Sync with server state on mount (for client-side navigation)
    useEffect(() => {
        setIsKioskMode(initialKioskMode)
    }, [initialKioskMode])

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
                setIsKioskMode(false)
                // Force full page reload to ensure clean state
                // This is critical for restoring full privileges
                window.location.reload()
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
