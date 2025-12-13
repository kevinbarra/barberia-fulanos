'use client'

import { useEffect } from 'react'
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

// Routes that are always allowed (for everyone)
const ALWAYS_ALLOWED = [
    '/admin',
    '/admin/bookings',
    '/admin/pos',
    '/admin/expenses',
    '/admin/schedule',
    '/admin/profile',
]

interface KioskRouteGuardProps {
    children: React.ReactNode
    role: string
}

/**
 * ZERO TRUST ROUTE GUARD
 * 
 * This component enforces access control at the route level.
 * If a user tries to manually navigate to a restricted route:
 * - In kiosk mode (any role): Instantly redirects to /admin/pos
 * - Staff role (any mode): Instantly redirects to /admin/pos
 * 
 * This prevents URL manipulation attacks.
 */
export default function KioskRouteGuard({ children, role }: KioskRouteGuardProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { isKioskMode } = useKioskMode()

    useEffect(() => {
        // Check if current route is restricted
        const isRestrictedRoute = RESTRICTED_ROUTES.some(route => pathname.startsWith(route))

        if (!isRestrictedRoute) return // Always allowed routes pass through

        // KIOSK MODE: Block everyone from restricted routes
        if (isKioskMode) {
            console.warn(`[RouteGuard] Kiosk mode active. Blocking access to: ${pathname}`)
            router.replace('/admin/pos')
            return
        }

        // STAFF ROLE: Block from restricted routes even when kiosk is off
        if (role === 'staff') {
            console.warn(`[RouteGuard] Staff role blocked from: ${pathname}`)
            router.replace('/admin/pos')
            return
        }

        // Owner, admin, super_admin: Allow access when kiosk is OFF
    }, [isKioskMode, role, pathname, router])

    return <>{children}</>
}
