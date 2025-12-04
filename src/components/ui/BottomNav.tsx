'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
// FIX: Agregamos Clock
import { LayoutDashboard, CalendarDays, User, Wallet, ShieldCheck, Clock } from 'lucide-react'

export default function BottomNav({
    role,
    showAdminEntry = false
}: {
    role: 'admin' | 'client',
    showAdminEntry?: boolean
}) {
    const pathname = usePathname()

    if (pathname.startsWith('/admin/pos')) return null;

    // MENU ADMIN EXPANDIDO
    const adminMenu = [
        { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
        { name: 'Agenda', href: '/admin/bookings', icon: CalendarDays },
        { name: 'POS', href: '/admin/pos', icon: Wallet },
        { name: 'Horarios', href: '/admin/schedule', icon: Clock }, // <--- NUEVO
        { name: 'Equipo', href: '/admin/team', icon: ShieldCheck },
        { name: 'Perfil', href: '/admin/profile', icon: User },
    ]

    const clientMenu = [
        { name: 'Mi Wallet', href: '/app', icon: Wallet },
        { name: 'Perfil', href: '/app/profile', icon: User },
    ]

    // Filtrar para Staff (No ven Equipo en móvil para ahorrar espacio, o lo dejamos si cabe)
    // Para simplificar y asegurar que Horarios se vea, filtramos Equipo si no es Owner
    const filteredAdminMenu = role === 'admin'
        ? adminMenu
        : adminMenu;
    // Nota: Podrías filtrar aquí si el menú queda muy apretado en pantallas pequeñas

    if (role === 'client' && showAdminEntry) {
        clientMenu.push({ name: 'Admin', href: '/admin', icon: ShieldCheck })
    }

    const menu = role === 'admin' ? filteredAdminMenu : clientMenu

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-3 pb-8 md:hidden z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            {/* Ajustamos max-w para que quepan 6 íconos si es necesario */}
            <div className="flex justify-between items-center max-w-lg mx-auto px-2">
                {menu.map((item) => {
                    const isActive = pathname === item.href
                    // Ocultar Equipo para Staff en móvil si queremos priorizar espacio
                    // (Opcional, por ahora lo dejamos)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 transition-all duration-300 min-w-[50px] ${isActive ? 'text-black scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <item.icon
                                size={22} // Un poco más pequeño para que quepan todos
                                strokeWidth={isActive ? 2.5 : 2}
                                className={isActive ? 'fill-gray-100' : ''}
                            />
                            <span className="text-[9px] truncate w-full text-center">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}