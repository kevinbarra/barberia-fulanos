'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Scissors, User, Wallet, ShieldCheck } from 'lucide-react'

export default function BottomNav({
    role,
    showAdminEntry = false
}: {
    role: 'admin' | 'client',
    showAdminEntry?: boolean
}) {
    const pathname = usePathname()

    // 🚨 LÓGICA POS: Si estamos en modo caja, ocultamos la navegación global
    if (pathname.startsWith('/admin/pos')) return null;

    const adminMenu = [
        { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
        { name: 'Agenda', href: '/admin/bookings', icon: CalendarDays },
        { name: 'Servicios', href: '/admin/services', icon: Scissors },
        { name: 'Perfil', href: '/admin/profile', icon: User },
    ]

    // ... (resto del código igual)

    const clientMenu = [
        { name: 'Mi Wallet', href: '/app', icon: Wallet },
        { name: 'Perfil', href: '/app/profile', icon: User },
    ]

    if (role === 'client' && showAdminEntry) {
        clientMenu.push({ name: 'Admin', href: '/admin', icon: ShieldCheck })
    }

    const menu = role === 'admin' ? adminMenu : clientMenu

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 pb-8 md:hidden z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className={`flex justify-between items-center ${menu.length > 2 ? 'max-w-sm' : 'max-w-[200px]'} mx-auto`}>
                {menu.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-black scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <item.icon
                                size={24}
                                strokeWidth={isActive ? 2.5 : 2}
                                className={isActive ? 'fill-gray-100' : ''}
                            />
                            <span className="text-[10px]">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}