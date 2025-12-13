'use client'

import { useState, Suspense } from 'react'
import { useKioskMode } from './KioskModeProvider'
import PinModal from './PinModal'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { clearKioskModeCookie } from '@/app/admin/settings/actions'

// Cookie name for client-side cleanup (backup only - server handles main deletion)
const KIOSK_COOKIE_NAME = 'agendabarber_kiosk_mode'

/**
 * KIOSK EXIT BUTTON - Complete Rebuild
 * 
 * Security Features:
 * 1. Email Isolation: Only visible if isKioskEnabled = true
 * 2. Server-side cookie deletion via clearKioskModeCookie()
 * 3. Client-side backup cleanup (localStorage, sessionStorage)
 * 4. 1 second delay before navigation
 */
function KioskExitButtonInner() {
    const { isKioskMode, canToggleKioskMode, isKioskEnabled } = useKioskMode()
    const [showPinModal, setShowPinModal] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // ========== EMAIL ISOLATION ==========
    // If kiosk is not enabled for this user, don't render ANYTHING
    if (!isKioskEnabled) return null

    // Only show if kiosk mode is active AND user can toggle
    if (!isKioskMode || !canToggleKioskMode) return null

    const handleClick = () => {
        setShowPinModal(true)
    }

    const handlePinVerify = async (pin: string): Promise<boolean> => {
        setIsLoading(true)
        try {
            console.log('[KioskExitButton] Starting deactivation process...')

            // ========== STEP 1: SERVER-SIDE COOKIE DELETION ==========
            // The cookie is HttpOnly - ONLY the server can delete it
            const result = await clearKioskModeCookie(pin, '')

            if (!result.success) {
                console.log('[KioskExitButton] Server rejected PIN')
                toast.error(result.error || 'PIN incorrecto')
                return false
            }

            console.log('[KioskExitButton] Server confirmed cookie deletion')
            toast.success('Modo Kiosko desactivado. Redirigiendo...')
            setShowPinModal(false)

            // ========== STEP 2: CLIENT-SIDE BACKUP CLEANUP ==========
            // These are backups - the server already deleted the HttpOnly cookie
            try {
                // Try to clear cookie from all possible paths (won't work for HttpOnly, but just in case)
                document.cookie = `${KIOSK_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
                document.cookie = `${KIOSK_COOKIE_NAME}=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT`

                // Clear all storage
                localStorage.removeItem('kioskMode')
                localStorage.removeItem('kiosk_mode')
                sessionStorage.clear()
            } catch (e) {
                // Ignore storage errors
            }

            // ========== STEP 3: ROBUST DELAY ==========
            // Wait 1 full second to ensure all async operations complete
            await new Promise(resolve => setTimeout(resolve, 1000))

            // ========== STEP 4: FORCED NAVIGATION ==========
            // Use kiosk_disabled param so provider knows to start grace period
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

// Wrap in Suspense because we use useSearchParams in provider
export default function KioskExitButton() {
    return (
        <Suspense fallback={null}>
            <KioskExitButtonInner />
        </Suspense>
    )
}
