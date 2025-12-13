'use client'

import { useState } from 'react'
import { useKioskMode } from './KioskModeProvider'
import PinModal from './PinModal'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { verifyKioskPin } from '@/app/admin/settings/actions'

// Cookie name must match server-side
const KIOSK_COOKIE_NAME = 'agendabarber_kiosk_mode'

/**
 * PERSISTENT KIOSK EXIT BUTTON (Client-Only Deactivation)
 * 
 * This button appears in the header/navbar when kiosk mode is active.
 * 
 * CRITICAL: Uses 100% CLIENT-SIDE deactivation to avoid server race conditions.
 * The server action is ONLY used for PIN verification, not cookie deletion.
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
            // ========== ONLY VERIFY PIN (Server Action) ==========
            // We verify the PIN but do NOT rely on server to delete the cookie
            const pinResult = await verifyKioskPin(pin, '')  // tenantId not needed for PIN check

            if (!pinResult.valid) {
                toast.error('PIN incorrecto')
                return false
            }

            // ========== CLIENT-SIDE NUKE (100% Client Deactivation) ==========
            toast.success('PIN correcto. Desactivando...')

            // 1. Kill the cookie in the browser EXPLICITLY (ALL path variations)
            document.cookie = `${KIOSK_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
            document.cookie = `${KIOSK_COOKIE_NAME}=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
            document.cookie = `${KIOSK_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
            // Also try with domain variations
            document.cookie = `${KIOSK_COOKIE_NAME}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`

            // 2. Clear ALL storage
            localStorage.removeItem('kioskMode')
            localStorage.removeItem('kiosk_mode')
            localStorage.removeItem('agendabarber_kiosk_mode')
            sessionStorage.removeItem('kioskMode')
            sessionStorage.removeItem('kiosk_mode')
            sessionStorage.clear()

            setShowPinModal(false)

            // 3. ROBUST DELAY: Wait 1 FULL SECOND to ensure cookie deletion propagates
            await new Promise(resolve => setTimeout(resolve, 1000))

            // 4. Forced navigation with unique cache-bust parameter
            window.location.href = `/admin?kiosk_reset_final=${Date.now()}`
            return true

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
