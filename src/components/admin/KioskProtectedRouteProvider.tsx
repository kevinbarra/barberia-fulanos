'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useKioskMode } from '@/components/admin/KioskModeProvider'

// Routes that are BLOCKED in kiosk mode OR for staff
const RESTRICTED_ROUTES = [
    '/admin/reports',
    '/admin/team',
    '/admin/services',
    '/admin/settings',
    '/admin/clients',
]

// Routes that are always allowed
const ALWAYS_ALLOWED = [
    '/admin',
    '/admin/bookings',
    '/admin/pos',
    '/admin/expenses',
    '/admin/schedule',
    '/admin/profile',
]

interface KioskProtectedContextType {
    isRestricted: boolean
}

const KioskProtectedContext = createContext<KioskProtectedContextType>({
    isRestricted: false
})

export function useKioskProtection() {
    return useContext(KioskProtectedContext)
}

interface KioskProtectedRouteProviderProps {
    children: ReactNode
    userRole: string
    tenantId: string
}

/**
 * ZERO TRUST PROTECTED ROUTE PROVIDER
 * 
 * This component enforces route-level access control:
 * - In kiosk mode: Blocks ALL users from restricted routes
 * - Staff role: Blocks from restricted routes even when kiosk is off
 * - Owners/Admins: Full access ONLY when kiosk is OFF
 * 
 * If access is denied, user is immediately redirected to /admin/pos
 */
export default function KioskProtectedRouteProvider({
    children,
    userRole,
    tenantId
}: KioskProtectedRouteProviderProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { isKioskMode } = useKioskMode()
    const [isRestricted, setIsRestricted] = useState(false)

    useEffect(() => {
        // Check if current path is restricted
        const isRestrictedRoute = RESTRICTED_ROUTES.some(route =>
            pathname.startsWith(route)
        )

        if (!isRestrictedRoute) {
            setIsRestricted(false)
            return // Always allowed routes pass through
        }

        // KIOSK MODE: Block EVERYONE from restricted routes (Zero Trust)
        if (isKioskMode) {
            console.warn(`[RouteGuard] Kiosk mode active. Redirecting from: ${pathname}`)
            setIsRestricted(true)
            router.replace('/admin/pos')
            return
        }

        // STAFF ROLE: Block from restricted routes even when kiosk is off
        if (userRole === 'staff') {
            console.warn(`[RouteGuard] Staff role blocked from: ${pathname}`)
            setIsRestricted(true)
            router.replace('/admin/pos')
            return
        }

        // Owner, admin, super_admin: Allow access when kiosk is OFF
        setIsRestricted(false)
    }, [isKioskMode, userRole, pathname, router])

    return (
        <KioskProtectedContext.Provider value={{ isRestricted }}>
            {children}
        </KioskProtectedContext.Provider>
    )
}
