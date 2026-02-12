import Link from "next/link"
import { Calendar, Users, CreditCard, BarChart3, Star, ArrowRight, Scissors, Clock, Smartphone, Check } from "lucide-react"
import ContactForm from "./ContactForm"

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
                    <a
                        href="https://wa.me/522291589149?text=Hola%2C%20me%20interesa%20AgendaBarber%20para%20mi%20barber%C3%ADa"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white hover:bg-zinc-100 text-zinc-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        Contactar
                    </a>
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
                        href="https://wa.me/522291589149?text=Hola%2C%20me%20interesa%20AgendaBarber%20para%20mi%20barber%C3%ADa"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-white hover:bg-zinc-100 text-zinc-900 font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:scale-105 shadow-[0_0_60px_rgba(255,255,255,0.15)] flex items-center justify-center gap-3"
                    >
                        <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        Contáctanos por WhatsApp
                    </a>
                    <a
                        href="#contact"
                        className="bg-transparent border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 font-medium px-8 py-4 rounded-2xl text-lg transition-all"
                    >
                        O déjanos tus datos
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
                        {features.map((feature, i) => (
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

                    <ContactForm />
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
