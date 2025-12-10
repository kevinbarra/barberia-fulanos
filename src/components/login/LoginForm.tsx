'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendOtp, verifyOtp } from '@/app/login/actions'
import { toast } from 'sonner'
import { ArrowRight, Loader2, Mail, Lock } from 'lucide-react'

export default function LoginForm() {
    const router = useRouter()
    const [step, setStep] = useState<'email' | 'code'>('email')
    const [email, setEmail] = useState('')
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
        const result = await verifyOtp(email, code)

        if (result.success && result.redirectUrl) {
            toast.success('¡Bienvenido!')
            // Hard redirect para asegurar navegación al subdominio
            window.location.href = result.redirectUrl
        } else {
            setIsLoading(false)
            toast.error(result.error || 'Código incorrecto')
        }
    }

    return (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-2xl shadow-2xl w-full">

            {/* PASO 1: EMAIL */}
            {step === 'email' ? (
                <form onSubmit={handleSendCode} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Acceso Seguro</h2>
                        <p className="text-zinc-400 text-sm">Ingresa tu correo para recibir un código.</p>
                    </div>

                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                        <input
                            type="email"
                            placeholder="tucorreo@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-600"
                            required
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <>Enviar Código <ArrowRight size={18} /></>}
                    </button>
                </form>
            ) : (
                /* PASO 2: CÓDIGO OTP */
                <form onSubmit={handleVerifyCode} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Ingresa el Código</h2>
                        <p className="text-zinc-400 text-sm">Enviado a <span className="text-white font-medium">{email}</span></p>
                        <button
                            type="button"
                            onClick={() => setStep('email')}
                            className="text-blue-400 text-xs hover:underline mt-1"
                        >
                            (Corregir correo)
                        </button>
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="123456"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} // Solo números, max 6
                            className="w-full bg-zinc-900/50 border border-zinc-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-600 text-center tracking-[0.5em] font-mono text-lg"
                            required
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || code.length < 6}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : "Entrar"}
                    </button>
                </form>
            )}
        </div>
    )
}