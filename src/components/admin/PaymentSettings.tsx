'use client'

import { useState, useEffect } from 'react'
import { updateTenantSetting, getTenantSettings } from '@/app/admin/settings/actions'
import { toast } from 'sonner'
import { Landmark, Coins, Loader2, CreditCard, Percent, DollarSign, ShieldCheck, Eye, EyeOff, Calculator, Info } from 'lucide-react'

export default function PaymentSettings() {
    const [settings, setSettings] = useState({
        payment_rules: { 
            mode: 'Libre',
            deposit_type: 'percentage', // percentage or fixed
            deposit_value: 0,
            threshold_amount: 0,
            mp_public_key: '',
            mp_access_token: ''
        },
        currency_symbol: '$',
        tax_rate: 0
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState<string | null>(null)
    const [showToken, setShowToken] = useState(false)
    const [samplePrice, setSamplePrice] = useState(1000)

    useEffect(() => {
        async function load() {
            const result = await getTenantSettings()
            if (result.settings) {
                const s = result.settings as any
                setSettings({
                    payment_rules: {
                        mode: 'Libre',
                        deposit_type: 'percentage',
                        deposit_value: 0,
                        threshold_amount: 0,
                        mp_public_key: '',
                        mp_access_token: '',
                        ...(s.payment_rules || {})
                    },
                    currency_symbol: s.currency_symbol || '$',
                    tax_rate: s.tax_rate || 0
                })
            }
            setIsLoading(false)
        }
        load()
    }, [])

    const handleChange = async (key: string, value: any) => {
        setIsSaving(key)
        const result = await updateTenantSetting(key, value)
        if (result.error) {
            toast.error(result.error)
        } else {
            setSettings(prev => ({ ...prev, [key]: value }))
            toast.success('Configuración actualizada')
        }
        setIsSaving(null)
    }

    const updatePaymentRule = (field: string, value: any) => {
        const newRules = { ...settings.payment_rules, [field]: value }
        handleChange('payment_rules', newRules)
    }

    // Calcula el anticipo proyectado para el simulador
    const calculateDeposit = (price: number) => {
        const { mode, deposit_type, deposit_value, threshold_amount } = settings.payment_rules
        
        if (mode === 'Libre') return 0
        if (mode === 'Pago Total') return price
        
        // Modo Anticipo con Umbral
        if (price < (threshold_amount || 0)) return 0
        
        if (deposit_type === 'percentage') {
            return (price * (deposit_value || 0)) / 100
        }
        return Math.min(price, (deposit_value || 0))
    }

    const projectedDeposit = calculateDeposit(samplePrice)

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* 1. SELECCIÓN DE MODO (Select Cards) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-black rounded-lg text-white">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Política de Reservas</h3>
                            <p className="text-sm text-gray-500">Define cómo y cuándo deben pagar tus clientes.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'Libre', label: 'Modo Libre', desc: 'Reserva sin pago previo.', color: 'bg-green-50 text-green-700' },
                            { id: 'Anticipo', label: 'Anticipo', desc: 'Cobro parcial para asegurar.', color: 'bg-blue-50 text-blue-700' },
                            { id: 'Pago Total', label: 'Pago Total', desc: 'Liquidación al reservar.', color: 'bg-purple-50 text-purple-700' }
                        ].map((m) => (
                            <button
                                key={m.id}
                                onClick={() => updatePaymentRule('mode', m.id)}
                                className={`relative p-5 rounded-2xl border-2 text-left transition-all group ${
                                    settings.payment_rules.mode === m.id
                                    ? 'border-black bg-black text-white shadow-xl shadow-gray-200'
                                    : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                                    settings.payment_rules.mode === m.id ? 'bg-white/20 text-white' : m.color
                                }`}>
                                    {m.id === 'Libre' && <Coins size={18} />}
                                    {m.id === 'Anticipo' && <Percent size={18} />}
                                    {m.id === 'Pago Total' && <ShieldCheck size={18} />}
                                </div>
                                <p className="font-black uppercase tracking-wider text-xs">{m.label}</p>
                                <p className={`text-[11px] mt-1 leading-relaxed ${settings.payment_rules.mode === m.id ? 'text-gray-300' : 'text-gray-400'}`}>
                                    {m.desc}
                                </p>
                                {settings.payment_rules.mode === m.id && (
                                    <div className="absolute top-4 right-4">
                                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {settings.payment_rules.mode === 'Anticipo' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* 2. CONFIGURADOR DE ANTICIPO */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <Percent size={18} className="text-blue-600" />
                            Configuración del Depósito
                        </h4>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Tipo de Anticipo</label>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button 
                                        onClick={() => updatePaymentRule('deposit_type', 'percentage')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${settings.payment_rules.deposit_type === 'percentage' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Percent size={14} /> Porcentaje
                                    </button>
                                    <button 
                                        onClick={() => updatePaymentRule('deposit_type', 'fixed')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${settings.payment_rules.deposit_type === 'fixed' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <DollarSign size={14} /> Monto Fijo
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">Valor del Pago</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={settings.payment_rules.deposit_value}
                                            onChange={(e) => updatePaymentRule('deposit_value', Number(e.target.value))}
                                            className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold"
                                        />
                                        <span className="absolute right-4 top-3.5 text-gray-400 font-bold">
                                            {settings.payment_rules.deposit_type === 'percentage' ? '%' : settings.currency_symbol}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">Umbral (Min $)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={settings.payment_rules.threshold_amount}
                                            onChange={(e) => updatePaymentRule('threshold_amount', Number(e.target.value))}
                                            className="w-full pl-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold"
                                        />
                                        <span className="absolute left-4 top-3.5 text-gray-400 font-bold">{settings.currency_symbol}</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-400 flex items-start gap-2">
                                <Info size={14} className="mt-0.5 flex-shrink-0" />
                                Si el servicio cuesta menos que el Umbral, no se pedirá anticipo.
                            </p>
                        </div>
                    </div>

                    {/* 3. SIMULADOR DINÁMICO */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl p-6 text-white flex flex-col justify-between overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Calculator size={120} />
                        </div>
                        
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Calculator size={16} />
                                </div>
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-400/80">Simulator de Cobro</span>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Si el servicio cuesta:</label>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black">{settings.currency_symbol}{samplePrice}</span>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="5000" 
                                            step="50"
                                            value={samplePrice}
                                            onChange={(e) => setSamplePrice(Number(e.target.value))}
                                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/10 flex items-end justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">El cliente pagará hoy:</p>
                                        <div className={`text-5xl font-black transition-all ${projectedDeposit > 0 ? 'text-green-400 scale-110 origin-left' : 'text-gray-500'}`}>
                                            {settings.currency_symbol}{projectedDeposit.toLocaleString()}
                                        </div>
                                    </div>
                                    {projectedDeposit === 0 && samplePrice > 0 && (
                                        <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded font-bold border border-red-500/30">
                                            Debajo del umbral
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <p className="mt-8 text-[11px] text-gray-400 font-medium">
                            * Cálculo basado en tu configuración actual de {settings.payment_rules.deposit_type === 'percentage' ? `${settings.payment_rules.deposit_value}%` : `${settings.currency_symbol}${settings.payment_rules.deposit_value}`}
                        </p>
                    </div>
                </div>
            )}

            {/* 4. CONEXIÓN MERCADO PAGO */}
            {settings.payment_rules.mode !== 'Libre' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                                <Landmark size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Mercado Pago</h4>
                                <p className="text-xs text-gray-500">Credenciales para procesar pagos de forma segura.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Producción</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Public Key</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={settings.payment_rules.mp_public_key}
                                    onChange={(e) => updatePaymentRule('mp_public_key', e.target.value)}
                                    placeholder="APP_USR-..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-sm font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Access Token</label>
                            <div className="relative">
                                <input
                                    type={showToken ? "text" : "password"}
                                    value={settings.payment_rules.mp_access_token}
                                    onChange={(e) => updatePaymentRule('mp_access_token', e.target.value)}
                                    placeholder="TEST-... o APP_USR-..."
                                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-sm font-mono"
                                />
                                <button
                                    onClick={() => setShowToken(!showToken)}
                                    className="absolute right-4 top-3.5 text-gray-400 hover:text-black transition-colors"
                                >
                                    {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ajustes Base */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6 opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                        <Coins size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Ajustes Base</h3>
                        <p className="text-xs text-gray-500">Moneda y cálculos de impuestos generales.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Símbolo</label>
                        <input
                            type="text"
                            value={settings.currency_symbol}
                            onChange={(e) => setSettings(prev => ({ ...prev, currency_symbol: e.target.value }))}
                            onBlur={(e) => handleChange('currency_symbol', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Impuesto (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={settings.tax_rate}
                                onChange={(e) => setSettings(prev => ({ ...prev, tax_rate: Number(e.target.value) }))}
                                onBlur={(e) => handleChange('tax_rate', Number(e.target.value))}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-black"
                            />
                            <span className="absolute right-4 top-3 text-gray-400 font-bold">%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
