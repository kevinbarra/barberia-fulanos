'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { verifyKioskPin } from '@/app/admin/settings/actions'

interface KioskModeContextType {
    isKioskMode: boolean
    canToggleKioskMode: boolean
    activateKioskMode: () => void
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
            activateKioskMode: () => { },
            deactivateKioskMode: async () => false
        }
    }
    return ctx
}

interface Props {
    children: ReactNode
    userRole: string
    tenantId: string
}

export default function KioskModeProvider({ children, userRole, tenantId }: Props) {
    const [isKioskMode, setIsKioskMode] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)

    // Only owner and super_admin can toggle kiosk mode
    const canToggleKioskMode = userRole === 'owner' || userRole === 'super_admin'

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`agendabarber_kiosk_${tenantId}`)
            if (stored === 'true') {
                setIsKioskMode(true)
            }
            setIsLoaded(true)
        }
    }, [tenantId])

    const activateKioskMode = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`agendabarber_kiosk_${tenantId}`, 'true')
            setIsKioskMode(true)
        }
    }, [tenantId])

    const deactivateKioskMode = useCallback(async (pin: string): Promise<boolean> => {
        try {
            const result = await verifyKioskPin(pin, tenantId)
            if (result.valid) {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem(`agendabarber_kiosk_${tenantId}`)
                }
                setIsKioskMode(false)
                return true
            }
            return false
        } catch (error) {
            console.error('Error verifying PIN:', error)
            return false
        }
    }, [tenantId])

    // Don't render until we've loaded the persisted state
    if (!isLoaded) {
        return null
    }

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
