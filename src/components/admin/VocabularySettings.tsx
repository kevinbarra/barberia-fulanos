'use client'

import { useState, useEffect } from 'react'
import { updateTenantSetting, getTenantSettings } from '@/app/admin/settings/actions'
import { toast } from 'sonner'
import { Briefcase, Loader2 } from 'lucide-react'

export default function VocabularySettings() {
    const [settings, setSettings] = useState({
        business_type: 'barber'
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState<string | null>(null)

    useEffect(() => {
        async function loadSettings() {
            const result = await getTenantSettings()
            if (result.settings) {
                const s = result.settings as any
                setSettings({
                    business_type: s.business_type || 'barber'
                })
            }
            setIsLoading(false)
        }
        loadSettings()
    }, [])

    const handleChange = async (key: string, value: string) => {
        setIsSaving(key)
        const result = await updateTenantSetting(key, value)
        if (result.error) {
            toast.error(result.error)
        } else {
            setSettings(prev => ({ ...prev, [key]: value }))
            toast.success('Vocabulario actualizado')
        }
        setIsSaving(null)
    }

    if (isLoading) {
        return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900">Giro de Negocio</p>
                        <p className="text-sm text-gray-500">Determina cómo se llama a tu personal y servicios.</p>
                    </div>
                </div>
                <select
                    value={settings.business_type}
                    onChange={(e) => handleChange('business_type', e.target.value)}
                    disabled={isSaving === 'business_type'}
                    className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-black focus:border-black block w-full md:w-48 p-2.5 outline-none transition-all"
                >
                    <option value="barber">Barbería (Barberos / Cortes)</option>
                    <option value="salon">Salón de Belleza (Estilistas / Servicios)</option>
                    <option value="spa">Spa / Clínica (Terapeutas / Tratamientos)</option>
                    <option value="nails">Uñas (Manicuristas / Servicios)</option>
                    <option value="default">Genérico (Personal / Servicios)</option>
                </select>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 italic">
                <p className="text-xs text-blue-700">
                    <b>Nota:</b> Al cambiar el giro, las etiquetas en la agenda y el widget de reserva se actualizarán automáticamente para coincidir con tu industria.
                </p>
            </div>
        </div>
    )
}
