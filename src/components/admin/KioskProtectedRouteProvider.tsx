'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import PinModal from '@/components/admin/PinModal'
import { verifyKioskPin } from '@/app/admin/settings/actions'

// Routes that require PIN verification for kiosk users
const PROTECTED_ROUTES = [
    '/admin/settings',
    '/admin/team',
    '/admin/reports',
    '/admin/services',
]

interface KioskProtectedContextType {
    isPinVerified: boolean
    requestPinVerification: () => void
}

const KioskProtectedContext = createContext<KioskProtectedContextType>({
    isPinVerified: false,
    requestPinVerification: () => { }
})

export function useKioskProtection() {
    return useContext(KioskProtectedContext)
}

interface KioskProtectedRouteProviderProps {
    children: ReactNode
    userRole: string
    tenantId: string
}

export default function KioskProtectedRouteProvider({
    children,
    userRole,
    tenantId
}: KioskProtectedRouteProviderProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [showPinModal, setShowPinModal] = useState(false)
    const [isPinVerified, setIsPinVerified] = useState(false)
    const [blockedPath, setBlockedPath] = useState<string | null>(null)

    // Check if current path is protected and user is kiosk
    useEffect(() => {
        if (userRole !== 'kiosk') return

        const isProtectedRoute = PROTECTED_ROUTES.some(route =>
            pathname.startsWith(route)
        )

        if (isProtectedRoute && !isPinVerified) {
            setBlockedPath(pathname)
            setShowPinModal(true)
        }
    }, [pathname, userRole, isPinVerified])

    const handlePinSuccess = () => {
        setIsPinVerified(true)
        setShowPinModal(false)
        // Allow access to the blocked path
        if (blockedPath) {
            setBlockedPath(null)
        }
    }

    const handlePinClose = () => {
        setShowPinModal(false)
        // Redirect back to dashboard if PIN not entered
        if (!isPinVerified && blockedPath) {
            router.push('/admin')
            setBlockedPath(null)
        }
    }

    const handleVerifyPin = async (pin: string): Promise<boolean> => {
        const result = await verifyKioskPin(pin, tenantId)
        return result.valid === true
    }

    const requestPinVerification = () => {
        setShowPinModal(true)
    }

    // If user is not kiosk, just render children
    if (userRole !== 'kiosk') {
        return <>{children}</>
    }

    return (
        <KioskProtectedContext.Provider value={{ isPinVerified, requestPinVerification }}>
            {/* Show content but with modal overlay if on protected route */}
            {children}

            {/* PIN Modal */}
            <PinModal
                isOpen={showPinModal}
                onClose={handlePinClose}
                onSuccess={handlePinSuccess}
                title="Acceso Restringido"
                description="Esta sección requiere PIN de administrador"
                correctPin=""
                verifyPin={handleVerifyPin}
            />
        </KioskProtectedContext.Provider>
    )
}
