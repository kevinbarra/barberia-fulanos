'use client'

import { useState } from 'react'
import { Lock, Eye, EyeOff, Save, Tablet, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { saveKioskPin } from '@/app/admin/settings/actions'
import { useKioskMode } from './KioskModeProvider'

interface KioskPinFormProps {
    initialPin: string | null
}

export default function KioskPinForm({ initialPin }: KioskPinFormProps) {
    const [pin, setPin] = useState(initialPin || '')
    const [showPin, setShowPin] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { isKioskMode } = useKioskMode()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (pin && !/^\d{4}$/.test(pin)) {
            toast.error('El PIN debe ser de 4 dígitos numéricos')
            return
        }

        setIsLoading(true)
        try {
            const result = await saveKioskPin(pin)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(result.message || 'PIN guardado')
            }
        } catch {
            toast.error('Error al guardar el PIN')
        } finally {
            setIsLoading(false)
        }
    }

    // SECURITY: Hide PIN form when kiosk mode is active to prevent bypass
    if (isKioskMode) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ShieldAlert size={24} className="text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-900">Configuración de PIN Bloqueada</h3>
                        <p className="text-sm text-amber-700 mt-1">
                            Por seguridad, no puedes cambiar el PIN mientras el modo kiosko está activo.
                            Desactiva el modo kiosko primero para configurar un nuevo PIN.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Tablet size={24} className="text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Modo Kiosko</h2>
                        <p className="text-sm text-gray-500">Configura el PIN para acceso a funciones protegidas</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Lock size={16} className="inline mr-2" />
                        PIN de 4 dígitos
                    </label>
                    <div className="relative">
                        <input
                            type={showPin ? 'text' : 'password'}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="••••"
                            maxLength={4}
                            pattern="\d{4}"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg tracking-[0.5em] text-center font-mono"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                        >
                            {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Este PIN se usará para acceder a Configuración, Reportes y Equipo desde una cuenta de kiosko.
                    </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 mb-2">¿Qué es el Modo Kiosko?</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Cuenta para tablet en recepción</li>
                        <li>• Solo ve: Dashboard, Agenda, POS, Perfil</li>
                        <li>• PIN requerido para áreas sensibles</li>
                    </ul>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                    <Save size={18} />
                    {isLoading ? 'Guardando...' : 'Guardar PIN'}
                </button>
            </form>
        </div>
    )
}
