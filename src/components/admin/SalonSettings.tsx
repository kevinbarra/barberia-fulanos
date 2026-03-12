'use client'

import { useState, useEffect } from 'react'
import { updateTenantSetting, getTenantSettings } from '@/app/admin/settings/actions'
import { toast } from 'sonner'
import { Landmark, Coins, Briefcase, Loader2, Sparkles } from 'lucide-react'

export default function SalonSettings() {
    const [settings, setSettings] = useState({
        business_type: 'barber',
        currency_symbol: '$',
        tax_rate: 0
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState<string | null>(null)

    useEffect(() => {
        async function loadSettings() {
            const result = await getTenantSettings()
            if (result.settings) {
                const s = result.settings as any
                setSettings({
                    business_type: s.business_type || 'barber',
                    currency_symbol: s.currency_symbol || '$',
                    tax_rate: s.tax_rate || 0
                })
            }
            setIsLoading(false)
        }
        loadSettings()
    }, [])

    const handleChange = async (key: string, value: string | number) => {
        setIsSaving(key)
        const result = await updateTenantSetting(key, value)
        if (result.error) {
            toast.error(result.error)
        } else {
            setSettings(prev => ({ ...prev, [key]: value }))
            toast.success('Configuración guardada')
        }
        setIsSaving(null)
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Configuración Pro</h3>
                        <p className="text-sm text-gray-500">Ajustes financieros y terminología.</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Tipo de Negocio */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">Tipo de Negocio</p>
                            <p className="text-sm text-gray-500">Ajusta los nombres en la agenda.</p>
                        </div>
                    </div>
                    <select
                        value={settings.business_type}
                        onChange={(e) => handleChange('business_type', e.target.value)}
                        disabled={isSaving === 'business_type'}
                        className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-brand focus:border-brand block w-full md:w-48 p-2.5 outline-none transition-all"
                    >
                        <option value="barber">Barbería</option>
                        <option value="salon">Salón de Belleza</option>
                        <option value="nails">Uñas / Spa</option>
                        <option value="default">Otro (Genérico)</option>
                    </select>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Símbolo de Moneda */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                            <Coins size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">Símbolo de Moneda</p>
                            <p className="text-sm text-gray-500">Se usará en tickets y reservas.</p>
                        </div>
                    </div>
                    <div className="relative w-full md:w-48">
                        <input
                            type="text"
                            value={settings.currency_symbol}
                            onChange={(e) => setSettings(prev => ({ ...prev, currency_symbol: e.target.value }))}
                            onBlur={(e) => handleChange('currency_symbol', e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-brand focus:border-brand block w-full p-2.5 outline-none transition-all"
                            placeholder="$"
                        />
                        {isSaving === 'currency_symbol' && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-gray-400" />}
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Tasa de Impuesto */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 rounded-xl text-green-600">
                            <Landmark size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">Impuesto (%)</p>
                            <p className="text-sm text-gray-500">Se aplicará automáticamente al cobro.</p>
                        </div>
                    </div>
                    <div className="relative w-full md:w-48">
                        <input
                            type="number"
                            value={settings.tax_rate}
                            onChange={(e) => setSettings(prev => ({ ...prev, tax_rate: Number(e.target.value) }))}
                            onBlur={(e) => handleChange('tax_rate', Number(e.target.value))}
                            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-brand focus:border-brand block w-full p-2.5 outline-none transition-all"
                            placeholder="0"
                        />
                        <div className="absolute right-10 top-2.5 text-gray-400 text-sm font-bold">%</div>
                        {isSaving === 'tax_rate' && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-gray-400" />}
                    </div>
                </div>
            </div>
        </div>
    )
}
