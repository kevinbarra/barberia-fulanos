'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
// CORRECCIÓN: Aseguramos que LogOut esté importado aquí 👇
import { LayoutDashboard, CalendarDays, Wallet, ShieldCheck, User, LogOut, Scissors, Clock } from 'lucide-react'
import { signOut } from '@/app/auth/actions'

export default function Sidebar({
    role,
    className = ""
}: {
    role: 'owner' | 'staff' | 'admin' | 'client' | string,
    className?: string
}) {
    const pathname = usePathname()

    const adminMenu = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Agenda', href: '/admin/bookings', icon: CalendarDays },
        { name: 'Terminal POS', href: '/admin/pos', icon: Wallet },
        { name: 'Equipo', href: '/admin/team', icon: ShieldCheck },
        { name: 'Servicios', href: '/admin/services', icon: Scissors },
        { name: 'Horarios', href: '/admin/schedule', icon: Clock },
        { name: 'Ajustes', href: '/admin/profile', icon: User },
    ]

    const clientMenu = [
        { name: 'Mi Wallet', href: '/app', icon: Wallet },
        { name: 'Mi Perfil', href: '/app/profile', icon: User },
    ]

    let menuToRender = adminMenu;

    if (role === 'client') {
        menuToRender = clientMenu;
    } else {
        // Staff: Le quitamos Equipo y Servicios, pero le DEJAMOS Horarios
        if (role !== 'owner') {
            menuToRender = adminMenu.filter(item =>
                item.href !== '/admin/team' &&
                item.href !== '/admin/services'
            );
        }
    }

    return (
        <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 hidden md:flex ${className}`}>
            <div className="p-6 border-b border-gray-100 mb-4">
                <h1 className="font-black text-2xl tracking-tighter text-gray-900">
                    FULANOS<span className="text-blue-600">.</span>
                </h1>
                <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-1 uppercase">
                    Sistema Admin
                </p>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                {menuToRender.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-black text-white shadow-lg shadow-gray-200 font-bold'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-black font-medium'
                                }`}
                        >
                            <item.icon
                                size={20}
                                strokeWidth={isActive ? 2.5 : 2}
                                className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-black transition-colors'}
                            />
                            <span className="text-sm">{item.name}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 w-full transition-all text-sm font-bold group"
                >
                    <LogOut size={20} className="group-hover:scale-110 transition-transform" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    )
}