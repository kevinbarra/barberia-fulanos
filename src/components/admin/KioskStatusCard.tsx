'use client'

import { useKioskMode } from './KioskModeProvider'

/**
 * KioskStatusCard - Client component that shows kiosk status
 * 
 * This component only renders for fulanosbarbermx@gmail.com
 * and only when kiosk mode is actually active.
 */
export default function KioskStatusCard() {
    const { isKioskMode, isLoading, isKioskEnabled } = useKioskMode()

    // EMAIL ISOLATION: Don't show for non-tablet users
    if (!isKioskEnabled) return null

    // Don't show while loading to prevent flash
    if (isLoading) return null

    // Only show when kiosk is actually active
    if (!isKioskMode) return null

    return (
        <div className="bg-purple-600 text-white p-5 rounded-2xl shadow-xl flex flex-col justify-between h-36 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500 rounded-full -mr-10 -mt-10 blur-xl opacity-50"></div>
            <div className="flex justify-between items-start z-10">
                <p className="text-purple-200 text-[10px] uppercase font-bold tracking-widest">Modo Activo</p>
                <span className="text-xl">🔒</span>
            </div>
            <div className="z-10">
                <h2 className="text-xl font-black tracking-tight">Modo Kiosko</h2>
                <p className="text-purple-200 text-xs mt-1">Datos protegidos</p>
            </div>
        </div>
    )
}
