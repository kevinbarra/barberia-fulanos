'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, User, Wallet, ShieldCheck } from 'lucide-react'

export default function BottomNav({
    role,
    showAdminEntry = false
}: {
    role: 'admin' | 'client',
    showAdminEntry?: boolean
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
        { name: 'Mi Wallet', href: '/app', icon: Wallet },
        { name: 'Perfil', href: '/app/profile', icon: User },
    ]

    // Filtrar para Staff (No ven Equipo en móvil para ahorrar espacio)
    const filteredAdminMenu = role === 'admin'
        ? (adminMenu.filter(item => {
            // Si quieres ocultar "Equipo" al staff en el menú móvil, descomenta esto:
            // if (item.name === 'Equipo') return false; 
            return true;
        }))
        : adminMenu;

    if (role === 'client' && showAdminEntry) {
        clientMenu.push({ name: 'Admin', href: '/admin', icon: ShieldCheck })
    }

    const menu = role === 'admin' ? filteredAdminMenu : clientMenu

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-3 pb-8 md:hidden z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className={`flex justify-between items-center ${menu.length > 4 ? 'max-w-full gap-2' : 'max-w-[250px]'} mx-auto px-4`}>
                {menu.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 transition-all duration-300 min-w-[50px] ${isActive ? 'text-black scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'
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