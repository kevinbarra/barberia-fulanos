'use client'

import Link from "next/link"
import { Calendar, Users, CreditCard, BarChart3, Star, ArrowRight, Scissors, Clock, Smartphone } from "lucide-react"

export default function SaaSLandingPage() {
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
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
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
                    <span className="text-sm text-zinc-300">Usado por +50 barberías en México</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[0.9]">
                    <span className="bg-gradient-to-r from-white via-white to-zinc-500 bg-clip-text text-transparent">
                        La agenda de tu barbería
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                        en piloto automático
                    </span>
                </h1>

                <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Sistema completo de gestión: reservas online, punto de venta, lealtad de clientes y reportes.
                    Todo lo que necesitas para hacer crecer tu negocio.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/login"
                        className="group bg-white text-black font-bold px-8 py-4 rounded-2xl text-lg hover:bg-zinc-100 transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                    >
                        Prueba Gratis 14 Días
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                        href="#features"
                        className="bg-zinc-900 border border-zinc-800 text-white font-medium px-8 py-4 rounded-2xl text-lg hover:bg-zinc-800 transition-all"
                    >
                        Ver Funciones
                    </Link>
                </div>

                {/* Trust badges */}
                <div className="mt-16 flex flex-wrap justify-center gap-8 text-zinc-500 text-sm">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Setup en 5 minutos</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span>Sin tarjeta requerida</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        <span>App para clientes</span>
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

            {/* CTA Section */}
            <section className="relative z-10 px-6 py-24">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-black mb-6">
                        ¿Listo para modernizar tu barbería?
                    </h2>
                    <p className="text-xl text-zinc-400 mb-10">
                        Únete a las barberías que ya gestionan todo desde un solo lugar.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold px-10 py-5 rounded-2xl text-xl hover:opacity-90 transition-all hover:scale-105 shadow-[0_0_60px_rgba(245,158,11,0.3)]"
                    >
                        Comenzar Ahora
                        <ArrowRight className="w-6 h-6" />
                    </Link>
                    <p className="text-zinc-500 text-sm mt-4">
                        14 días gratis • Sin tarjeta • Cancela cuando quieras
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
                        © {new Date().getFullYear()} AgendaBarber. Hecho con ☕ en México.
                    </p>
                    <div className="flex gap-6 text-zinc-500 text-sm">
                        <Link href="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link>
                        <Link href="#features" className="hover:text-white transition-colors">Funciones</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
