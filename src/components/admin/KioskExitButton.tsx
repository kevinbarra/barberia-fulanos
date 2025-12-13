'use client'

import { useState } from 'react'
import { useKioskMode } from './KioskModeProvider'
import PinModal from './PinModal'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { clearKioskModeCookie } from '@/app/admin/settings/actions'

/**
 * PERSISTENT KIOSK EXIT BUTTON
 * 
 * DEFINITIVE FIX:
 * - The cookie is HttpOnly so client-side document.cookie CANNOT delete it
 * - We MUST call the server action clearKioskModeCookie to delete it
 * - Then navigate after server confirms deletion
 */
export default function KioskExitButton() {
    const { isKioskMode, canToggleKioskMode, isKioskEnabled } = useKioskMode()
    const [showPinModal, setShowPinModal] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // ISOLATION: Don't show if kiosk is not enabled for this user
    if (!isKioskEnabled) return null

    // Only show if kiosk mode is active AND user can toggle it (owner/super_admin)
    if (!isKioskMode || !canToggleKioskMode) return null

    const handleClick = () => {
        setShowPinModal(true)
    }

    const handlePinVerify = async (pin: string): Promise<boolean> => {
        setIsLoading(true)
        try {
            // ========== SERVER-SIDE COOKIE DELETION ==========
            // CRITICAL: The cookie is HttpOnly - ONLY the server can delete it!
            // We call clearKioskModeCookie which:
            // 1. Verifies the PIN
            // 2. Calls cookieStore.delete() on the server
            console.log('[KioskExitButton] Calling clearKioskModeCookie...')

            const result = await clearKioskModeCookie(pin, '')  // tenantId obtained from session

            console.log('[KioskExitButton] Server response:', result)

            if (!result.success) {
                toast.error(result.error || 'PIN incorrecto')
                return false
            }

            // ========== SUCCESS - Cookie is deleted on server ==========
            toast.success('Modo Kiosko desactivado. Redirigiendo...')
            setShowPinModal(false)

            // Clear any client-side storage (not cookies, those are HttpOnly)
            try {
                localStorage.removeItem('kioskMode')
                sessionStorage.clear()
            } catch (e) {
                // Ignore storage errors
            }

            // Wait a moment for server state to propagate
            await new Promise(resolve => setTimeout(resolve, 500))

            // Navigate to completely fresh page
            // The layout.tsx will read the cookie (now deleted) and set initialKioskMode = false
            window.location.href = `/admin?kiosk_disabled=${Date.now()}`
            return true

        } catch (error) {
            console.error('[KioskExitButton] Error:', error)
            toast.error('Error al desactivar el modo kiosko')
            return false
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* Floating Exit Button - Always visible in kiosk mode */}
            <button
                onClick={handleClick}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg shadow-lg transition-all active:scale-95 disabled:opacity-50"
                title="Desactivar Modo Kiosco"
            >
                <Lock size={14} />
                <span className="hidden sm:inline">{isLoading ? 'Saliendo...' : 'Salir de Kiosco'}</span>
                <span className="sm:hidden">🔓</span>
            </button>

            {/* PIN Modal */}
            <PinModal
                isOpen={showPinModal}
                onClose={() => !isLoading && setShowPinModal(false)}
                onSuccess={() => Promise.resolve()}
                title="Desactivar Modo Kiosco"
                description="Ingresa el PIN de administrador para desbloquear"
                correctPin=""
                verifyPin={handlePinVerify}
            />
        </>
    )
}
