'use client'

import { useState } from 'react'
import { useKioskMode } from './KioskModeProvider'
import PinModal from './PinModal'
import { Lock, Unlock, X } from 'lucide-react'
import { toast } from 'sonner'

/**
 * PERSISTENT KIOSK EXIT BUTTON
 * 
 * This button appears in the header/navbar when kiosk mode is active.
 * Provides an escape route for owners to deactivate kiosk mode.
 * - Visible ONLY when isKioskMode === true AND user canToggleKioskMode
 * - Opens PIN modal on click
 * - Forces full reload after deactivation
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
            const success = await deactivateKioskMode(pin)
            if (success) {
                toast.success('Modo Kiosko desactivado. Recargando...')
                setShowPinModal(false)
                // The provider already calls window.location.reload()
            } else {
                toast.error('PIN incorrecto')
            }
            return success
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* Floating Exit Button - Always visible in kiosk mode */}
            <button
                onClick={handleClick}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg shadow-lg transition-all active:scale-95"
                title="Desactivar Modo Kiosco"
            >
                <Lock size={14} />
                <span className="hidden sm:inline">Salir de Kiosco</span>
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
