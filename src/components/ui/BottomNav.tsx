'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Wallet, ShieldCheck, User, Scissors, CalendarPlus } from 'lucide-react'

export default function BottomNav({
    role,
    showAdminEntry = false,
    tenantSlug // Required - parent must provide this
}: {
    role: 'admin' | 'client',
    showAdminEntry?: boolean,
    tenantSlug: string // Now required, no default
}) {
    const pathname = usePathname()

    if (pathname.startsWith('/admin/pos')) return null;

    const adminMenu = [
        { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
        { name: 'Agenda', href: '/admin/bookings', icon: CalendarDays },
        { name: 'POS', href: '/admin/pos', icon: Wallet },
        { name: 'Equipo', href: '/admin/team', icon: ShieldCheck },
        { name: 'Perfil', href: '/admin/profile', icon: User },
    ]

    const clientMenu = [
        { name: 'Wallet', href: '/app', icon: Wallet },
        { name: 'Reservar', href: `/book/${tenantSlug}`, icon: CalendarPlus },
        { name: 'Perfil', href: '/app/profile', icon: User },
    ]

    // Filtrar para Staff
    const filteredAdminMenu = role === 'admin'
        ? (adminMenu.filter(item => {
            // Opcional: ocultar ítems si falta espacio
            return true;
        }))
        : adminMenu;

    if (role === 'client' && showAdminEntry) {
        clientMenu.push({ name: 'Admin', href: '/admin', icon: ShieldCheck })
    }

    const menu = role === 'admin' ? filteredAdminMenu : clientMenu

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 pb-8 md:hidden z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className={`flex justify-between items-center ${menu.length > 4 ? 'gap-2' : 'justify-around'} max-w-md mx-auto`}>
                {menu.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 transition-all duration-300 min-w-[60px] ${isActive ? 'text-black scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <item.icon
                                size={24}
                                strokeWidth={isActive ? 2.5 : 2}
                                className={isActive ? 'fill-gray-100' : ''}
                            />
                            <span className="text-[10px] truncate w-full text-center">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}