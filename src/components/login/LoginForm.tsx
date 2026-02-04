'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { sendOtp, verifyOtp } from '@/app/login/actions'
import { toast } from 'sonner'
import { ArrowRight, Loader2, Mail, Shield, Sparkles, CheckCircle2 } from 'lucide-react'

export default function LoginForm() {
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('next') || undefined
    const prefillEmail = searchParams.get('email') || ''
    const isSignupMode = searchParams.get('mode') === 'signup'

    const [step, setStep] = useState<'email' | 'code'>('email')
    const [email, setEmail] = useState(prefillEmail)
    const [code, setCode] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // FASE 1: Enviar Correo
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setIsLoading(true)
        const result = await sendOtp(email)
        setIsLoading(false)

        if (result.success) {
            setStep('code')
            toast.success('¡Código enviado! Revisa tu correo.')
        } else {
            toast.error(result.error || 'Error al enviar código')
        }
    }

    // FASE 2: Verificar Código  
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code) return

        setIsLoading(true)
        const result = await verifyOtp(email, code, redirectTo)

        if (result.success && result.redirectUrl) {
            toast.success(isSignupMode ? '¡Cuenta creada!' : '¡Bienvenido!')
            await new Promise(resolve => setTimeout(resolve, 500))
            window.location.href = result.redirectUrl
        } else {
            setIsLoading(false)
            toast.error(result.error || 'Código incorrecto')
        }
    }

    return (
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl shadow-2xl w-full">

            {/* PASO 1: EMAIL */}
            {step === 'email' ? (
                <form onSubmit={handleSendCode} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* Header with Mode-specific styling */}
                    <div className="text-center mb-8">
                        {isSignupMode ? (
                            <>
                                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
                                    <Sparkles className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2">Crea tu Cuenta</h2>
                                <p className="text-zinc-400 text-sm">
                                    Ingresa tu correo para comenzar. Sin contraseñas.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                                    <Shield className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2">Acceso Seguro</h2>
                                <p className="text-zinc-400 text-sm">
                                    Te enviaremos un código de acceso único.
                                </p>
                            </>
                        )}
                    </div>

                    {/* Email Input */}
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5 transition-colors group-focus-within:text-amber-400" />
                        <input
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-zinc-800/50 border border-zinc-700 text-white rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder:text-zinc-600 text-base"
                            required
                            autoFocus
                        />
                    </div>

                    {/* CTA Button */}
                    <button
                        type="submit"
                        disabled={isLoading || !email}
                        className={`w-full font-bold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-base shadow-lg ${isSignupMode
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/25 hover:shadow-amber-500/40'
                                : 'bg-white text-black hover:bg-zinc-100'
                            }`}
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin w-5 h-5" />
                        ) : (
                            <>
                                {isSignupMode ? 'Crear Cuenta' : 'Enviar Código'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>
            ) : (
                /* PASO 2: CÓDIGO OTP */
                <form onSubmit={handleVerifyCode} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* Success Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
                            <CheckCircle2 className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Código Enviado</h2>
                        <p className="text-zinc-400 text-sm">
                            Revisa <span className="text-white font-semibold">{email}</span>
                        </p>
                        <button
                            type="button"
                            onClick={() => setStep('email')}
                            className="text-amber-400 text-xs hover:underline mt-2 inline-block"
                        >
                            ← Cambiar correo
                        </button>
                    </div>

                    {/* OTP Input */}
                    <div className="relative">
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="• • • • • •"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full bg-zinc-800/50 border border-zinc-700 text-white rounded-xl px-4 py-4 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-all placeholder:text-zinc-600 text-center tracking-[0.4em] font-mono text-2xl"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Verify Button */}
                    <button
                        type="submit"
                        disabled={isLoading || code.length < 6}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl hover:shadow-green-500/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-base shadow-lg shadow-green-500/25"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin w-5 h-5" />
                        ) : (
                            <>
                                {isSignupMode ? 'Crear mi Cuenta' : 'Verificar y Entrar'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>
            )}
        </div>
    )
}