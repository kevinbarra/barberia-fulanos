'use client'

import { useState } from 'react'
import { useKioskMode } from './KioskModeProvider'
import PinModal from './PinModal'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'

/**
 * KIOSK EXIT BUTTON - LocalStorage-Based
 * 
 * This button uses the new localStorage-based kiosk state.
 * PIN verification is done via server action, but state is purely client-side.
 */
export default function KioskExitButton() {
    const { isKioskMode, canToggleKioskMode, isKioskEnabled, deactivateKioskMode } = useKioskMode()
    const [showPinModal, setShowPinModal] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // ISOLATION: Don't show if kiosk is not enabled for this user
    if (!isKioskEnabled) return null

    // Only show if kiosk mode is active AND user can toggle
    if (!isKioskMode || !canToggleKioskMode) return null

    const handleClick = () => {
        setShowPinModal(true)
    }

    const handlePinVerify = async (pin: string): Promise<boolean> => {
        setIsLoading(true)
        try {
            console.log('[KioskExitButton] Verifying PIN...')

            // Use the provider's deactivateKioskMode which:
            // 1. Verifies PIN via server action
            // 2. Sets localStorage token if PIN is correct
            const success = await deactivateKioskMode(pin)

            if (!success) {
                toast.error('PIN incorrecto')
                return false
            }

            console.log('[KioskExitButton] Kiosk deactivated successfully')
            toast.success('Modo Kiosko desactivado')
            setShowPinModal(false)

            // Small delay then reload to ensure clean state
            await new Promise(resolve => setTimeout(resolve, 500))
            window.location.reload()

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
