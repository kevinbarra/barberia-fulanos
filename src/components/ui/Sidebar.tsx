'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
// FIX: Agregamos Settings a los imports (LogOut ya estaba bien)
import { LayoutDashboard, CalendarDays, Wallet, ShieldCheck, User, LogOut, Scissors, Clock, Settings, Users, BarChart3, Tablet, RefreshCw } from 'lucide-react'
import { signOut } from '@/app/auth/actions'
import { useKioskMode } from '@/components/admin/KioskModeProvider'
import { toast } from 'sonner'

export default function Sidebar({
    role,
    tenantName = 'AgendaBarber',
    className = ""
}: {
    role: 'owner' | 'staff' | 'admin' | 'client' | string,
    tenantName?: string,
    className?: string
}) {
    const pathname = usePathname()
    const { isKioskMode } = useKioskMode()

    const adminMenu = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Reportes', href: '/admin/reports', icon: BarChart3 },
        { name: 'Agenda', href: '/admin/bookings', icon: CalendarDays },
        { name: 'Terminal POS', href: '/admin/pos', icon: Wallet },
        { name: 'Clientes', href: '/admin/clients', icon: Users },
        { name: 'Equipo', href: '/admin/team', icon: ShieldCheck },
        { name: 'Servicios', href: '/admin/services', icon: Scissors },
        { name: 'Horarios', href: '/admin/schedule', icon: Clock },
        { name: 'Configuración', href: '/admin/settings', icon: Settings },
        { name: 'Ajustes', href: '/admin/profile', icon: User },
    ]

    const clientMenu = [
        { name: 'Mi Wallet', href: '/app', icon: Wallet },
        { name: 'Mi Perfil', href: '/app/profile', icon: User },
    ]

    // Kiosk mode routes - operational items only (for staff in kiosk mode)
    const kioskAllowedRoutes = ['/admin', '/admin/bookings', '/admin/pos', '/admin/schedule', '/admin/profile', '/admin/settings']

    // Determine if user should have full access (owners/super_admins always have full access)
    const hasFullAccess = role === 'owner' || role === 'super_admin' || role === 'admin'

    let menuToRender = adminMenu;

    if (role === 'client') {
        menuToRender = clientMenu;
    } else if (isKioskMode && !hasFullAccess) {
        // Kiosk mode filtering only applies to staff, not owners/admins
        menuToRender = adminMenu.filter(item => kioskAllowedRoutes.includes(item.href))
    } else if (role === 'staff') {
        // Staff: No access to Team, Services, Settings, Reports
        menuToRender = adminMenu.filter(item =>
            item.href !== '/admin/team' &&
            item.href !== '/admin/services' &&
            item.href !== '/admin/settings' &&
            item.href !== '/admin/reports'
        );
    }
    // Owner, admin, and super_admin see everything

    return (
        <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 hidden lg:flex ${className}`}>
            <div className="p-6 border-b border-gray-100 mb-4">
                <h1 className="font-black text-2xl tracking-tighter text-gray-900 uppercase">
                    {tenantName.length > 12 ? tenantName.slice(0, 12) + '.' : tenantName}<span className="text-blue-600">.</span>
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

            <div className="p-4 border-t border-gray-100 space-y-2">
                {/* Sync/Reload Button for PWA */}
                <button
                    onClick={() => {
                        toast.info('Sincronizando sistema...')
                        setTimeout(() => window.location.reload(), 500)
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 w-full transition-all text-sm font-medium group"
                >
                    <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                    Sincronizar
                </button>
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