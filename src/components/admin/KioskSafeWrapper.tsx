'use client'

import { useKioskMode } from '@/components/admin/KioskModeProvider'
import { ShieldAlert } from 'lucide-react'

interface KioskSafeWrapperProps {
    children: React.ReactNode
    hideInKiosk?: boolean
    placeholder?: React.ReactNode
}

/**
 * Wrapper component to hide sensitive content when kiosk mode is active.
 * Use this to wrap financial data, sensitive KPIs, etc.
 * 
 * @param children - Content to show when NOT in kiosk mode
 * @param hideInKiosk - If true, hides children in kiosk mode (default: true)
 * @param placeholder - Optional content to show instead in kiosk mode
 */
export default function KioskSafeWrapper({
    children,
    hideInKiosk = true,
    placeholder
}: KioskSafeWrapperProps) {
    const { isKioskMode } = useKioskMode()

    if (isKioskMode && hideInKiosk) {
        if (placeholder) {
            return <>{placeholder}</>
        }
        // Default placeholder for hidden content
        return (
            <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                <ShieldAlert size={20} className="text-gray-400" />
                <span className="text-sm text-gray-500 font-medium">
                    Contenido protegido en modo kiosko
                </span>
            </div>
        )
    }

    return <>{children}</>
}
