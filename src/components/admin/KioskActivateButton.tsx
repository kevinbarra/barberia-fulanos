'use client'

import { useKioskMode } from './KioskModeProvider'
import { Monitor } from 'lucide-react'
import { toast } from 'sonner'

/**
 * KIOSK ACTIVATE BUTTON
 * 
 * Complementary to KioskExitButton - shows when kiosk is OFF but user has permission.
 * Allows owner/super_admin to activate kiosk mode without going to Settings.
 */
export default function KioskActivateButton() {
    const { isKioskMode, canToggleKioskMode, isKioskEnabled, activateKioskMode } = useKioskMode()

    // Only show if: kiosk feature is enabled AND kiosk is OFF AND user can toggle
    if (!isKioskEnabled) return null
    if (isKioskMode) return null
    if (!canToggleKioskMode) return null

    const handleClick = () => {
        activateKioskMode()
        toast.success('Modo Kiosko activado. Datos sensibles ocultos.')
    }

    return (
        <button
            onClick={handleClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white text-sm font-bold rounded-lg shadow-lg transition-all active:scale-95"
            title="Activar Modo Kiosco"
        >
            <Monitor size={14} />
            <span className="hidden sm:inline">Activar Kiosco</span>
            <span className="sm:hidden">🔒</span>
        </button>
    )
}
