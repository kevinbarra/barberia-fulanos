'use client'

import { useState, useEffect } from 'react'
import { updateTenantSetting, getTenantSettings } from '@/app/admin/settings/actions'
import { toast } from 'sonner'
import { Zap, Wrench, Loader2 } from 'lucide-react'

export default function WorkflowModeToggle() {
    const [mode, setMode] = useState<'auto' | 'manual'>('manual')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        async function loadSettings() {
            const result = await getTenantSettings()
            if (result.settings) {
                const settings = result.settings as { workflow_mode?: 'auto' | 'manual' }
                setMode(settings.workflow_mode || 'manual')
            }
            setIsLoading(false)
        }
        loadSettings()
    }, [])

    const handleChange = async (newMode: 'auto' | 'manual') => {
        if (newMode === mode) return
        setIsSaving(true)

        const result = await updateTenantSetting('workflow_mode', newMode)

        if (result.error) {
            toast.error(result.error)
        } else {
            setMode(newMode)
            toast.success(newMode === 'auto'
                ? 'Modo Ágil activado — Las citas se cobran automáticamente'
                : 'Modo Manual activado — Control total del cobro'
            )
        }
        setIsSaving(false)
    }

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">Modo de Operación</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Define cómo se procesan las citas al terminar.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Agile Mode */}
                <button
                    onClick={() => handleChange('auto')}
                    disabled={isSaving}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${mode === 'auto'
                        ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-200'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                        } disabled:opacity-50`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${mode === 'auto' ? 'bg-amber-100' : 'bg-gray-100'}`}>
                            <Zap className={`w-5 h-5 ${mode === 'auto' ? 'text-amber-600' : 'text-gray-400'}`} />
                        </div>
                        <span className="font-bold text-gray-900">Ágil</span>
                        {mode === 'auto' && (
                            <span className="ml-auto text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">ACTIVO</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">
                        Auto-cobra 15 min después. Silencioso, sin mensajes al cliente.
                    </p>
                </button>

                {/* Legacy Mode */}
                <button
                    onClick={() => handleChange('manual')}
                    disabled={isSaving}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${mode === 'manual'
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                        } disabled:opacity-50`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${mode === 'manual' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                            <Wrench className={`w-5 h-5 ${mode === 'manual' ? 'text-blue-600' : 'text-gray-400'}`} />
                        </div>
                        <span className="font-bold text-gray-900">Manual</span>
                        {mode === 'manual' && (
                            <span className="ml-auto text-xs font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">ACTIVO</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">
                        Tú decides cuándo cobrar. Control total de cada cita.
                    </p>
                </button>
            </div>
        </div>
    )
}
