'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Wallet, ShieldCheck, User, LogOut, Scissors, Clock, Settings, Users, BarChart3, RefreshCw, Receipt, Lock, History as HistoryIcon } from 'lucide-react'
import { signOut } from '@/app/auth/actions'
import { useKioskMode } from '@/components/admin/KioskModeProvider'
import KioskExitButton from '@/components/admin/KioskExitButton'
import KioskActivateButton from '@/components/admin/KioskActivateButton'
import { toast } from 'sonner'

// ZERO TRUST: Define routes by access level
const FULL_ADMIN_MENU = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Reportes', href: '/admin/reports', icon: BarChart3 },
    { name: 'Agenda', href: '/admin/bookings', icon: CalendarDays },
    { name: 'Terminal POS', href: '/admin/pos', icon: Wallet },
    { name: 'Gastos', href: '/admin/expenses', icon: Receipt },
    { name: 'Clientes', href: '/admin/clients', icon: Users },
    { name: 'Equipo', href: '/admin/team', icon: ShieldCheck },
    { name: 'Servicios', href: '/admin/services', icon: Scissors },
    { name: 'Horarios', href: '/admin/schedule', icon: Clock },
    { name: 'Configuración', href: '/admin/settings', icon: Settings },
    { name: 'Ajustes', href: '/admin/profile', icon: User },
]

// KIOSK MODE: Only operational items - NO reports, settings, team management
const KIOSK_ALLOWED_MENU = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Agenda', href: '/admin/bookings', icon: CalendarDays },
    { name: 'Terminal POS', href: '/admin/pos', icon: Wallet },
    { name: 'Gastos', href: '/admin/expenses', icon: Receipt },
    { name: 'Horarios', href: '/admin/schedule', icon: Clock },
]

// STAFF: Limited access (no sensitive data)
const STAFF_MENU = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Agenda', href: '/admin/bookings', icon: CalendarDays },
    { name: 'Terminal POS', href: '/admin/pos', icon: Wallet },
    { name: 'Gastos', href: '/admin/expenses', icon: Receipt },
    { name: 'Clientes', href: '/admin/clients', icon: Users },
    { name: 'Horarios', href: '/admin/schedule', icon: Clock },
    { name: 'Ajustes', href: '/admin/profile', icon: User },
]

const CLIENT_MENU = [
    { name: 'Mi Wallet', href: '/app', icon: Wallet },
    { name: 'Mi Perfil', href: '/app/profile', icon: User },
]

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

    // ZERO TRUST: Determine menu based on strictest applicable restriction
    const getMenuToRender = () => {
        // Client always gets client menu
        if (role === 'client') {
            return CLIENT_MENU
        }

        // KIOSK MODE: Universal restriction - applies to EVERYONE including owners
        // This is the strictest mode - hides all sensitive data
        if (isKioskMode) {
            return KIOSK_ALLOWED_MENU
        }

        // Staff: Limited access even when kiosk is off
        if (role === 'staff') {
            return STAFF_MENU
        }

        // Owner, admin, super_admin: Full access (only when kiosk is OFF)
        // Clone the menu to avoid mutating the constant
        const menu = [...FULL_ADMIN_MENU]

        // Add Audit Logs for Owners and Super Admins
        if (role === 'owner' || role === 'super_admin') {
            // Find index of Settings to insert after it, or just push
            const settingsIndex = menu.findIndex(item => item.href === '/admin/settings')
            if (settingsIndex !== -1) {
                menu.splice(settingsIndex + 1, 0, {
                    name: 'Auditoría',
                    href: '/admin/settings/logs',
                    icon: HistoryIcon
                })
            } else {
                menu.push({
                    name: 'Auditoría',
                    href: '/admin/settings/logs',
                    icon: HistoryIcon
                })
            }
        }

        return menu
    }

    const menuToRender = getMenuToRender()

    return (
        <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 hidden lg:flex ${className}`}>
            <div className="p-6 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                    <h1 className="font-black text-2xl tracking-tighter text-gray-900 uppercase">
                        {tenantName.length > 12 ? tenantName.slice(0, 12) + '.' : tenantName}<span className="text-blue-600">.</span>
                    </h1>
                    {isKioskMode && (
                        <div className="bg-purple-100 p-1.5 rounded-lg" title="Modo Kiosco Activo">
                            <Lock size={14} className="text-purple-600" />
                        </div>
                    )}
                </div>
                <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-1 uppercase">
                    {isKioskMode ? 'Modo Kiosco' : 'Sistema Admin'}
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
                {/* KIOSK BUTTONS - Activate when off, Exit when on */}
                <KioskActivateButton />
                <KioskExitButton />

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