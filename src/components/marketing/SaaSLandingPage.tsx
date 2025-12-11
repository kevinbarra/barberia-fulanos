'use client'

import { useState } from 'react'
import Link from "next/link"
import { Calendar, Users, CreditCard, BarChart3, Star, ArrowRight, Scissors, Clock, Smartphone, Check, Send, Mail, Building, Phone, MessageSquare } from "lucide-react"
import { toast } from 'sonner'

export default function SaaSLandingPage() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        businessName: '',
        email: '',
        phone: '',
        message: ''
    })

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (response.ok && data.success) {
                toast.success('¡Mensaje enviado! Te contactaremos en menos de 24 horas.')
                setFormData({ businessName: '', email: '', phone: '', message: '' })
            } else {
                toast.error(data.error || 'Error al enviar. Intenta de nuevo.')
            }
        } catch (error) {
            toast.error('Error de conexión. Verifica tu internet.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const plans = [
        {
            name: "PRO",
            price: "$1,299",
            period: "/mes",
            description: "Todo incluido para tu barbería.",
            features: [
                "Hasta 5 Barberos",
                "Agenda y Citas Online",
                "Punto de Venta (POS)",
                "App Clientes + Kiosko iPad",
                "Programa de Lealtad",
                "Reportes Avanzados",
                "Soporte WhatsApp Local",
                "Instalación: $2,999 (Pago único)"
            ],
            cta: "Agendar Demo",
            popular: true,
            href: "#contact"
        },
        {
            name: "Enterprise",
            price: "Cotizar",
            period: "",
            description: "Para cadenas y franquicias.",
            features: [
                "Barberos Ilimitados",
                "Multi-sucursal Centralizado",
                "API Personalizada",
                "Onboarding Presencial",
                "Gerente de Cuenta Dedicado",
                "SLA de Soporte 24/7",
                "Whitelabel (Tu marca)",
                "Instalación a la medida"
            ],
            cta: "Contactar Ventas",
            popular: false,
            href: "#contact"
        }
    ]

    return (
        <div className="min-h-screen bg-zinc-950 text-white overflow-hidden">
            {/* Background gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 blur-[150px] rounded-full" />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 px-6 py-4 flex justify-between items-center max-w-6xl mx-auto">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center">
                        <Scissors className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-black text-xl tracking-tight">AgendaBarber</span>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm">
                    <a href="#features" className="text-zinc-400 hover:text-white transition-colors">Funciones</a>
                    <a href="#pricing" className="text-zinc-400 hover:text-white transition-colors">Precios</a>
                    <a href="#contact" className="text-zinc-400 hover:text-white transition-colors">Contacto</a>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium hidden sm:block">
                        Iniciar Sesión
                    </Link>
                    <Link
                        href="/login"
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105"
                    >
                        Comenzar Gratis
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 px-6 pt-20 pb-32 max-w-6xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 mb-8">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-zinc-300">Sistema Probado en Operación Real</span>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[0.9]">
                    <span className="bg-gradient-to-r from-white via-white to-zinc-500 bg-clip-text text-transparent">
                        La agenda de tu barbería
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                        en piloto automático
                    </span>
                </h1>

                <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed px-4">
                    Sistema completo de gestión: reservas online, punto de venta, lealtad de clientes y reportes.
                    Todo lo que necesitas para hacer crecer tu negocio.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                        href="#contact"
                        className="group bg-white text-black font-bold px-8 py-4 rounded-2xl text-lg hover:bg-zinc-100 transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                    >
                        Agenda tu Demo
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                    <a
                        href="#features"
                        className="bg-zinc-900 border border-zinc-800 text-white font-medium px-8 py-4 rounded-2xl text-lg hover:bg-zinc-800 transition-all"
                    >
                        Ver Funciones
                    </a>
                </div>

                {/* Trust badges */}
                <div className="mt-16 flex flex-wrap justify-center gap-6 sm:gap-8 text-zinc-500 text-sm">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Setup en 5 días</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Capacitación incluida</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        <span>Soporte directo WhatsApp</span>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="relative z-10 px-6 py-24 bg-zinc-900/50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black mb-4">
                            Todo lo que necesitas en un solo lugar
                        </h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">
                            Diseñado específicamente para barberías que quieren profesionalizar su operación.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Calendar,
                                title: "Reservas Online 24/7",
                                description: "Tus clientes reservan desde su celular. Sin llamadas, sin WhatsApp."
                            },
                            {
                                icon: CreditCard,
                                title: "Punto de Venta",
                                description: "Registra ventas, servicios múltiples y métodos de pago en segundos."
                            },
                            {
                                icon: Star,
                                title: "Programa de Lealtad",
                                description: "Puntos automáticos por visita. Tus clientes regresan más seguido."
                            },
                            {
                                icon: Users,
                                title: "Gestión de Equipo",
                                description: "Cada barbero con su agenda. Comisiones y permisos personalizados."
                            },
                            {
                                icon: BarChart3,
                                title: "Reportes en Tiempo Real",
                                description: "Ventas, servicios populares, horas pico. Datos para tomar decisiones."
                            },
                            {
                                icon: Smartphone,
                                title: "App para Clientes",
                                description: "Tu barbería con marca propia. QR para puntos y reservas rápidas."
                            }
                        ].map((feature, i) => (
                            <div
                                key={i}
                                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all group"
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <feature.icon className="w-6 h-6 text-amber-400" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="relative z-10 px-6 py-24">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black mb-4">
                            Precios simples y transparentes
                        </h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">
                            Sin sorpresas, sin comisiones ocultas. Elige el plan que mejor se adapte a tu negocio.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
                        {plans.map((plan, i) => (
                            <div
                                key={i}
                                className={`relative bg-zinc-900 border rounded-3xl p-6 sm:p-8 transition-all ${plan.popular
                                    ? 'border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.15)]'
                                    : 'border-zinc-800 hover:border-zinc-700'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold px-4 py-1.5 rounded-full">
                                            MÁS POPULAR
                                        </span>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                    <p className="text-zinc-500 text-sm">{plan.description}</p>
                                </div>

                                <div className="mb-6">
                                    <span className="text-4xl sm:text-5xl font-black">{plan.price}</span>
                                    <span className="text-zinc-500">{plan.period}</span>
                                </div>

                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature, j) => (
                                        <li key={j} className="flex items-center gap-3 text-sm">
                                            <Check className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                            <span className="text-zinc-300">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <a
                                    href={plan.href}
                                    className={`w-full py-3 sm:py-4 rounded-xl font-bold text-center block transition-all hover:scale-105 ${plan.popular
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black'
                                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
                                        }`}
                                >
                                    {plan.cta}
                                </a>
                            </div>
                        ))}
                    </div>

                    <p className="text-center text-zinc-500 text-sm mt-8">
                        Todos los planes incluyen 14 días de prueba gratis. Sin compromiso.
                    </p>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="relative z-10 px-6 py-24 bg-zinc-900/50">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-black mb-4">
                            ¿Tienes preguntas?
                        </h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">
                            Escríbenos y te responderemos en menos de 24 horas.
                        </p>
                    </div>

                    <form onSubmit={handleContactSubmit} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 md:p-10">
                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    <Building className="inline w-4 h-4 mr-2" />
                                    Nombre del negocio
                                </label>
                                <input
                                    type="text"
                                    value={formData.businessName}
                                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                    required
                                    placeholder="Tu barbería"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    <Mail className="inline w-4 h-4 mr-2" />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    placeholder="correo@ejemplo.com"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                <Phone className="inline w-4 h-4 mr-2" />
                                Teléfono (opcional)
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+52 55 1234 5678"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-colors"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                <MessageSquare className="inline w-4 h-4 mr-2" />
                                ¿En qué podemos ayudarte?
                            </label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                required
                                rows={4}
                                placeholder="Cuéntanos sobre tu barbería y qué necesitas..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-colors resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>Enviando...</>
                            ) : (
                                <>
                                    Enviar Mensaje
                                    <Send className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 px-6 py-24">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-black mb-6">
                        ¿Listo para modernizar tu barbería?
                    </h2>
                    <p className="text-xl text-zinc-400 mb-10">
                        Agenda una demo y descubre cómo AgendaBarber puede multiplicar tus ventas.
                    </p>
                    <a
                        href="#contact"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold px-10 py-5 rounded-2xl text-xl hover:opacity-90 transition-all hover:scale-105 shadow-[0_0_60px_rgba(245,158,11,0.3)]"
                    >
                        Solicitar Demo
                        <ArrowRight className="w-6 h-6" />
                    </a>
                    <p className="text-zinc-500 text-sm mt-4">
                        Setup profesional • Instalación incluida • Soporte dedicado
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 px-6 py-8 border-t border-zinc-900">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-600 rounded-lg flex items-center justify-center">
                            <Scissors className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold">AgendaBarber</span>
                    </div>
                    <p className="text-zinc-600 text-sm">
                        © {new Date().getFullYear()} AgendaBarber. Hecho por Kevin Barra.
                    </p>
                    <div className="flex gap-6 text-zinc-500 text-sm">
                        <Link href="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link>
                        <a href="#features" className="hover:text-white transition-colors">Funciones</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Precios</a>
                        <a href="#contact" className="hover:text-white transition-colors">Contacto</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
