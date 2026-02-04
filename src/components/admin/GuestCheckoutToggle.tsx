'use client'

import { useState, useEffect } from 'react'
import { updateTenantSetting, getTenantSettings } from '@/app/admin/settings/actions'
import { toast } from 'sonner'
import { Users, UserX, Loader2 } from 'lucide-react'

export default function GuestCheckoutToggle() {
    const [isEnabled, setIsEnabled] = useState(true) // Default: enabled
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // Load current setting on mount
    useEffect(() => {
        async function loadSettings() {
            const result = await getTenantSettings()
            if (result.settings) {
                const settings = result.settings as { guest_checkout_enabled?: boolean }
                // Default to true if not set
                setIsEnabled(settings.guest_checkout_enabled !== false)
            }
            setIsLoading(false)
        }
        loadSettings()
    }, [])

    const handleToggle = async () => {
        const newValue = !isEnabled
        setIsSaving(true)

        const result = await updateTenantSetting('guest_checkout_enabled', newValue)

        if (result.error) {
            toast.error(result.error)
        } else {
            setIsEnabled(newValue)
            toast.success(newValue ? 'Reservas de invitados activadas' : 'Reservas de invitados desactivadas')
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
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${isEnabled ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isEnabled ? (
                            <Users className="w-6 h-6 text-green-600" />
                        ) : (
                            <UserX className="w-6 h-6 text-red-600" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Reservas de Invitados</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {isEnabled
                                ? 'Cualquier persona puede reservar sin crear cuenta.'
                                : 'Solo clientes registrados pueden reservar.'}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                            Útil para links de WhatsApp y redes sociales.
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleToggle}
                    disabled={isSaving}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 disabled:opacity-50 ${isEnabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                >
                    <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                    />
                </button>
            </div>
        </div>
    )
}
