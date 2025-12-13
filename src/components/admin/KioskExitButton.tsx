'use client'

import { useState } from 'react'
import { useKioskMode } from './KioskModeProvider'
import PinModal from './PinModal'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'

// Cookie name must match server-side
const KIOSK_COOKIE_NAME = 'agendabarber_kiosk_mode'

/**
 * PERSISTENT KIOSK EXIT BUTTON (With Client-Side Nuke)
 * 
 * This button appears in the header/navbar when kiosk mode is active.
 * Provides an escape route for owners to deactivate kiosk mode.
 * 
 * CRITICAL: Uses explicit client-side cookie/localStorage cleanup
 * to guarantee the browser is clean before navigation.
 */
export default function KioskExitButton() {
    const { isKioskMode, canToggleKioskMode, deactivateKioskMode } = useKioskMode()
    const [showPinModal, setShowPinModal] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Only show if kiosk mode is active AND user can toggle it (owner/super_admin)
    if (!isKioskMode || !canToggleKioskMode) return null

    const handleClick = () => {
        setShowPinModal(true)
    }

    const handlePinVerify = async (pin: string): Promise<boolean> => {
        setIsLoading(true)
        try {
            // ========== CLIENT-SIDE NUKE (FORCE CLEANUP) ==========
            // 1. Kill the cookie in the browser EXPLICITLY (multiple path variations)
            document.cookie = `${KIOSK_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
            document.cookie = `${KIOSK_COOKIE_NAME}=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
            document.cookie = `${KIOSK_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`

            // 2. Clear localStorage just in case
            localStorage.removeItem('kioskMode')
            localStorage.removeItem('kiosk_mode')
            localStorage.removeItem('agendabarber_kiosk_mode')

            // 3. Also clear sessionStorage
            sessionStorage.removeItem('kioskMode')
            sessionStorage.removeItem('kiosk_mode')

            // ========== SERVER-SIDE CLEANUP ==========
            // 4. Now call the Server Action to clear server-side state
            const success = await deactivateKioskMode(pin)

            if (success) {
                toast.success('Modo Kiosko desactivado. Redirigiendo...')
                setShowPinModal(false)

                // 5. ROBUST DELAY: Wait 500ms for cookie to be fully cleared
                // This breaks the race condition between client and server
                await new Promise(resolve => setTimeout(resolve, 500))

                // 6. Forced navigation with cache-bust parameter
                // Using unique timestamp ensures completely fresh navigation
                window.location.href = `/admin?kiosk_reset=${Date.now()}`
                return true
            } else {
                toast.error('PIN incorrecto')
                return false
            }
        } catch (error) {
            console.error('Error deactivating kiosk:', error)
            toast.error('Error al desactivar')
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
                onClose={() => setShowPinModal(false)}
                onSuccess={() => Promise.resolve()}
                title="Desactivar Modo Kiosco"
                description="Ingresa el PIN de administrador para desbloquear"
                correctPin=""
                verifyPin={handlePinVerify}
            />
        </>
    )
}
