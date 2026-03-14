"use client";

import { useState, useEffect } from "react";
import Link from "next/link"
import { Calendar, Users, CreditCard, BarChart3, Star, ArrowRight, Scissors, Clock, Smartphone, Check, Loader2, ExternalLink } from "lucide-react"
import ContactForm from "./ContactForm"
import { PLATFORM_WHATSAPP } from '@/lib/constants'

// --- SKELETON COMPONENTS ---
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-zinc-200 rounded-xl ${className}`} />
);

const FeatureSkeleton = () => (
    <div className="bg-white/70 backdrop-blur-md border border-white p-6 rounded-2xl shadow-sm">
        <Skeleton className="w-12 h-12 mb-4" />
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
    </div>
);

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

const features = [
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
]

export default function SaaSLandingPage() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] overflow-hidden selection:bg-brand selection:text-white">
            {/* Background gradients (Subtle) */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-brand/5 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-purple-500/5 blur-[150px] rounded-full" />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 px-6 py-4 flex justify-between items-center max-w-6xl mx-auto backdrop-blur-md bg-white/30 sticky top-0 border-b border-white/20">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
                        <Scissors className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-black text-xl tracking-tight">AgendaBarber</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-[#86868B]">
                    <a href="#features" className="hover:text-black transition-colors">Funciones</a>
                    <a href="#pricing" className="hover:text-black transition-colors">Precios</a>
                    <a href="#contact" className="hover:text-black transition-colors">Contacto</a>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-[#1D1D1F] hover:text-brand transition-colors text-sm font-bold uppercase tracking-widest hidden sm:block">
                        Acceso
                    </Link>
                    <a
                        href={`https://wa.me/${PLATFORM_WHATSAPP}?text=${encodeURIComponent('Hola, me interesa AgendaBarber para mi barbería')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-black hover:bg-zinc-800 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all hover:scale-105 shadow-xl shadow-black/10"
                    >
                        Demo Gratis
                    </a>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 px-6 pt-24 pb-32 max-w-6xl mx-auto text-center">
                {isLoading ? (
                    <div className="space-y-6">
                        <Skeleton className="h-10 w-48 mx-auto rounded-full" />
                        <Skeleton className="h-20 w-3/4 mx-auto" />
                        <Skeleton className="h-12 w-2/3 mx-auto" />
                    </div>
                ) : (
                    <>
                        <div className="inline-flex items-center gap-2 bg-white/50 backdrop-blur-md border border-white rounded-full px-5 py-2 mb-10 shadow-sm">
                            <Star className="w-4 h-4 text-brand fill-brand" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#86868B]">El Estándar Premium de Puebla</span>
                        </div>

                        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[0.85] text-black">
                            Domina tu agenda.<br />
                            <span className="bg-gradient-to-r from-brand to-brand/60 bg-clip-text text-transparent">Sin esfuerzo.</span>
                        </h1>

                        <p className="text-xl sm:text-2xl text-[#86868B] max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
                            Olvídate del caos. Sistema 360° con reservas online, POS y lealtad diseñado para las mejores barberías.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-5 justify-center">
                            <a
                                href={`https://wa.me/${PLATFORM_WHATSAPP}?text=${encodeURIComponent('Hola, me interesa AgendaBarber para mi barbería')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group bg-black hover:bg-zinc-800 text-white font-black px-10 py-5 rounded-[2rem] text-xl transition-all hover:scale-105 shadow-2xl shadow-black/20 flex items-center justify-center gap-3"
                            >
                                Iniciar ahora
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                            </a>
                        </div>
                    </>
                )}
            </section>

            {/* Features Section */}
            <section id="features" className="relative z-10 px-6 py-32 bg-white/40 backdrop-blur-md border-y border-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20 text-black">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Potencia Industrial</h2>
                        <p className="text-[#86868B] max-w-2xl mx-auto font-medium text-lg">
                            Cada herramienta ha sido forjada para optimizar tus ingresos y automatizar tu flujo de trabajo diario.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {isLoading ? (
                            Array(6).fill(0).map((_, i) => <FeatureSkeleton key={i} />)
                        ) : (
                            features.map((feature, i) => (
                                <div
                                    key={i}
                                    className="bg-white/70 backdrop-blur-md border border-white rounded-[2.5rem] p-8 hover:shadow-2xl hover:-translate-y-2 transition-all group shadow-sm"
                                >
                                    <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand group-hover:text-white transition-all">
                                        <feature.icon className="w-8 h-8 text-brand group-hover:text-white transition-colors" />
                                    </div>
                                    <h3 className="font-black text-xl mb-3 text-black">{feature.title}</h3>
                                    <p className="text-[#86868B] text-base leading-relaxed font-medium">{feature.description}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="relative z-10 px-6 py-32">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 text-black tracking-tight">Planes a tu medida</h2>
                        <p className="text-[#86868B] max-w-2xl mx-auto font-medium text-lg">
                            Escalabilidad sin fricciones. Desde barberías locales hasta grandes cadenas.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
                        {plans.map((plan, i) => (
                            <div
                                key={i}
                                className={`relative bg-white/80 backdrop-blur-xl border-2 rounded-[3rem] p-10 transition-all ${plan.popular
                                    ? 'border-brand shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
                                    : 'border-white hover:border-brand/30 shadow-sm hover:shadow-xl'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                                        <span className="bg-brand text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-lg">
                                            Recomendado
                                        </span>
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className="text-2xl font-black mb-2 text-black">{plan.name}</h3>
                                    <p className="text-[#86868B] font-medium">{plan.description}</p>
                                </div>

                                <div className="mb-8 flex items-baseline gap-1">
                                    <span className="text-5xl font-black text-black">{plan.price}</span>
                                    <span className="text-[#86868B] font-bold text-sm uppercase tracking-widest">{plan.period}</span>
                                </div>

                                <ul className="space-y-4 mb-10">
                                    {plan.features.map((feature, j) => (
                                        <li key={j} className="flex items-center gap-3 text-sm font-bold text-[#1D1D1F]">
                                            <div className="w-5 h-5 bg-brand/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                <Check className="w-3 h-3 text-brand" strokeWidth={3} />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <a
                                    href={plan.href}
                                    className={`w-full py-5 rounded-[2rem] font-black text-lg text-center block transition-all hover:scale-105 shadow-xl ${plan.popular
                                        ? 'bg-brand text-white shadow-brand/20'
                                        : 'bg-zinc-100 text-black hover:bg-zinc-200 shadow-zinc-200/50'
                                        }`}
                                >
                                    {plan.cta}
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="relative z-10 px-6 py-32 bg-white/40 backdrop-blur-md border-y border-white">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 text-black tracking-tight">Hablemos de tu éxito</h2>
                        <p className="text-[#86868B] font-medium text-lg">
                            Cuéntanos sobre tu negocio y un experto te contactará en minutos.
                        </p>
                    </div>

                    <ContactForm />
                </div>
            </section>

            {/* ELITE CTA — PRE-FOOTER */}
            <section className="relative z-10 py-20 px-6 bg-[#F5F5F7]">
                <div className="max-w-2xl mx-auto text-center">
                    <p className="text-[#1D1D1F] text-lg md:text-xl font-light leading-relaxed mb-8">
                        Establezca un nuevo estándar de rigor con <span className="font-semibold">sistemas de élite</span> y una <span className="font-semibold">ingeniería de precisión</span> enfocada exclusivamente en resultados de alto impacto. Agende su consultoría estratégica y acceda a la estructura tecnológica que profesionalizará su operación de forma definitiva.
                    </p>
                    <a
                        href="https://kevinconsulting.services"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#1A1A1A] text-[#F5F5F0] px-8 py-4 rounded-full font-semibold text-sm tracking-wide shadow-[0_4px_20px_rgb(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:scale-[1.03] transition-all duration-300"
                    >
                        Solicitar Auditoría de Sistemas
                        <ExternalLink size={14} />
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 px-6 py-16 bg-[#F5F5F7] border-t border-gray-200/50">
                <div className="max-w-6xl mx-auto flex flex-col items-center gap-8">
                    {/* AUTHOR IDENTITY */}
                    <a href="https://kevinconsulting.services" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                        <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-zinc-400 group-hover:text-zinc-600 transition-colors">Kevin Consulting</span>
                        <span className="text-[10px] font-light tracking-widest text-zinc-400">Tecnología que profesionaliza tu negocio</span>
                        <span className="text-[9px] font-light tracking-widest text-zinc-300">Ingeniería de precisión · Sistemas de élite</span>
                    </a>

                    {/* NAV + COPYRIGHT */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex gap-8 text-zinc-400 text-xs font-bold uppercase tracking-[0.2em]">
                            <a href="#features" className="hover:text-black transition-colors">Funciones</a>
                            <a href="#pricing" className="hover:text-black transition-colors">Precios</a>
                            <a href="#contact" className="hover:text-black transition-colors">Contacto</a>
                        </div>
                        <p className="text-zinc-300 text-[10px] font-light uppercase tracking-widest">
                            © {new Date().getFullYear()} AgendaBarber
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
