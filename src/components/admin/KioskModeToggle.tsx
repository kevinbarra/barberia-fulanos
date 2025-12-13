'use client'

import { useState } from 'react'
import { useKioskMode } from './KioskModeProvider'
import PinModal from './PinModal'
import { Tablet, Lock, Unlock, Shield, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function KioskModeToggle() {
    const { isKioskMode, canToggleKioskMode, activateKioskMode, deactivateKioskMode } = useKioskMode()
    const [showPinModal, setShowPinModal] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Only render for owner/super_admin
    if (!canToggleKioskMode) return null

    const handleToggle = () => {
        if (isKioskMode) {
            // Need PIN to deactivate
            setShowPinModal(true)
        } else {
            // Activate directly
            activateKioskMode()
            toast.success('Modo Kiosko activado. Datos sensibles ocultos.')
        }
    }

    const handlePinVerify = async (pin: string): Promise<boolean> => {
        setIsLoading(true)
        try {
            const success = await deactivateKioskMode(pin)
            if (success) {
                toast.success('Modo Kiosko desactivado. Acceso completo restaurado.')
                setShowPinModal(false)
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header with gradient */}
                <div className={`p-6 border-b border-gray-100 ${isKioskMode
                        ? 'bg-gradient-to-r from-purple-100 to-blue-100'
                        : 'bg-gradient-to-r from-gray-50 to-gray-100'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isKioskMode ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                            <Tablet size={24} />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-gray-900">Modo Kiosko</h2>
                            <p className={`text-sm ${isKioskMode ? 'text-purple-700 font-medium' : 'text-gray-500'}`}>
                                {isKioskMode ? '🔒 Activo - Datos sensibles ocultos' : 'Para tablets compartidas'}
                            </p>
                        </div>

                        {/* Status badge - visible on tablet/desktop */}
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${isKioskMode
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                            {isKioskMode ? <Lock size={14} /> : <Unlock size={14} />}
                            {isKioskMode ? 'ACTIVO' : 'INACTIVO'}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* What gets hidden in kiosk mode */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Shield size={16} className="text-purple-600" />
                            ¿Qué se oculta en Modo Kiosko?
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-red-600">
                                <span>❌</span> Reportes
                            </div>
                            <div className="flex items-center gap-2 text-red-600">
                                <span>❌</span> Equipo
                            </div>
                            <div className="flex items-center gap-2 text-red-600">
                                <span>❌</span> Servicios
                            </div>
                            <div className="flex items-center gap-2 text-red-600">
                                <span>❌</span> Clientes
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">✅ Disponible:</span> Dashboard, Agenda, POS, Horarios
                            </p>
                        </div>
                    </div>

                    {/* Warning if active */}
                    {isKioskMode && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                            <div className="text-sm text-amber-800">
                                <p className="font-bold">Modo Kiosko está activo</p>
                                <p>Los empleados que usen este dispositivo tendrán acceso limitado. Necesitarás el PIN para desactivar.</p>
                            </div>
                        </div>
                    )}

                    {/* Toggle button - large for tablet touch */}
                    <button
                        onClick={handleToggle}
                        disabled={isLoading}
                        className={`w-full py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${isKioskMode
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            } disabled:opacity-50`}
                    >
                        {isKioskMode ? (
                            <>
                                <Unlock size={22} />
                                Desactivar Modo Kiosko
                            </>
                        ) : (
                            <>
                                <Lock size={22} />
                                Activar Modo Kiosko
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* PIN Modal */}
            <PinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSuccess={() => Promise.resolve()}
                title="Desactivar Modo Kiosko"
                description="Ingresa el PIN de administrador para desbloquear"
                correctPin=""
                verifyPin={handlePinVerify}
            />
        </>
    )
}
