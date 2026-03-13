'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    LayoutDashboard, CalendarDays, Wallet, ShieldCheck, User, LogOut, 
    Scissors, Clock, Settings, Users, BarChart3, RefreshCw, Receipt, 
    Lock, History as HistoryIcon, Layers, Type, Palette, Landmark, 
    ChevronDown, Globe
} from 'lucide-react'
import { signOut } from '@/app/auth/actions'
import { useKioskMode } from '@/components/admin/KioskModeProvider'
import KioskExitButton from '@/components/admin/KioskExitButton'
import KioskActivateButton from '@/components/admin/KioskActivateButton'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ZERO TRUST: Define grouped routes
const ADMIN_GROUPS = [
    {
        name: 'Operaciones',
        items: [
            { name: 'Agenda', href: '/admin/bookings', icon: CalendarDays },
            { name: 'Clientes', href: '/admin/clients', icon: Users },
            { name: 'Terminal POS', href: '/admin/pos', icon: Wallet },
        ]
    },
    {
        name: 'Gestión de Equipo',
        items: [
            { name: 'Staff / Equipo', href: '/admin/team', icon: ShieldCheck },
            { name: 'Competencias', href: '/admin/team/matrix', icon: Layers },
            { name: 'Horarios', href: '/admin/schedule', icon: Clock },
        ]
    },
    {
        name: 'Configuración',
        items: [
            { name: 'Perfil', href: '/admin/profile', icon: User },
            { name: 'Vocabulario', href: '/admin/settings/vocabulary', icon: Type },
            { name: 'Branding / Logo', href: '/admin/settings/branding', icon: Palette },
            { name: 'Ajustes App', href: '/admin/settings', icon: Settings },
        ]
    },
    {
        name: 'Finanzas',
        items: [
            { name: 'Reglas de Pago', href: '/admin/settings/payments', icon: Landmark },
            { name: 'Reportes', href: '/admin/reports', icon: BarChart3 },
            { name: 'Gastos', href: '/admin/expenses', icon: Receipt },
        ]
    }
]

const KIOSK_ALLOWED_MENU = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Agenda', href: '/admin/bookings', icon: CalendarDays },
    { name: 'Terminal POS', href: '/admin/pos', icon: Wallet },
    { name: 'Gastos', href: '/admin/expenses', icon: Receipt },
    { name: 'Horarios', href: '/admin/schedule', icon: Clock },
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
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        'Operaciones': true,
        'Gestión de Equipo': true,
        'Configuración': false,
        'Finanzas': false
    })

    const toggleGroup = (name: string) => {
        setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }))
    }

    if (role === 'client') {
        const clientItems = [
            { name: 'Mi Wallet', href: '/app', icon: Wallet },
            { name: 'Mi Perfil', href: '/app/profile', icon: User },
        ]
        return (
            <aside className={cn("w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 hidden lg:flex", className)}>
                <div className="p-6 border-b border-gray-100 mb-4">
                    <h1 className="font-black text-2xl tracking-tighter text-gray-900 uppercase">
                        {tenantName}<span className="text-blue-600">.</span>
                    </h1>
                </div>
                <nav className="flex-1 px-4 space-y-2">
                    {clientItems.map(item => (
                        <SidebarLink key={item.href} item={item} isActive={pathname === item.href} />
                    ))}
                </nav>
            </aside>
        )
    }

    return (
        <aside className={cn("w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 hidden lg:flex", className)}>
            <div className="p-6 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                    <h1 className="font-black text-2xl tracking-tighter text-gray-900 uppercase">
                        {tenantName.length > 12 ? tenantName.slice(0, 12) + '.' : tenantName}<span className="text-blue-600">.</span>
                    </h1>
                    {isKioskMode && (
                        <div className="bg-purple-100 p-1.5 rounded-lg">
                            <Lock size={14} className="text-purple-600" />
                        </div>
                    )}
                </div>
                <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-1 uppercase">
                    {isKioskMode ? 'Modo Kiosco' : 'Sistema Admin'}
                </p>
            </div>

            <nav className="flex-1 px-4 pb-4 space-y-4 overflow-y-auto scrollbar-hide">
                {/* DASHBOARD - Always visible */}
                <SidebarLink 
                    item={{ name: 'Dashboard', href: '/admin', icon: LayoutDashboard }} 
                    isActive={pathname === '/admin'} 
                />

                {!isKioskMode ? (
                    ADMIN_GROUPS.map(group => {
                        // Filter items based on role (staff has limited config access)
                        const allowedItems = group.items.filter(item => {
                            if (role === 'staff') {
                                return !['/admin/settings', '/admin/settings/payments', '/admin/settings/branding', '/admin/team/matrix'].includes(item.href)
                            }
                            return true
                        })

                        if (allowedItems.length === 0) return null

                        const isGroupOpen = openGroups[group.name]
                        const isAnyItemActive = allowedItems.some(item => pathname === item.href)

                        return (
                            <div key={group.name} className="space-y-1">
                                <button
                                    onClick={() => toggleGroup(group.name)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors",
                                        isAnyItemActive ? "text-black" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    {group.name}
                                    <ChevronDown 
                                        size={12} 
                                        className={cn("transition-transform duration-200", isGroupOpen ? "" : "-rotate-90")} 
                                    />
                                </button>
                                <AnimatePresence initial={false}>
                                    {(isGroupOpen || isAnyItemActive) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                            className="overflow-hidden space-y-1"
                                        >
                                            {allowedItems.map(item => (
                                                <SidebarLink 
                                                    key={item.href} 
                                                    item={item} 
                                                    isActive={pathname === item.href} 
                                                    subtle 
                                                />
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    })
                ) : (
                    KIOSK_ALLOWED_MENU.map(item => (
                        <SidebarLink key={item.href} item={item} isActive={pathname === item.href} />
                    ))
                )}

                {/* PLATFORM MANAGEMENT - Super Admin Only */}
                {role === 'super_admin' && !isKioskMode && (
                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <SidebarLink 
                            item={{ name: 'Platform Control', href: '/admin/platform', icon: Globe }} 
                            isActive={pathname === '/admin/platform'}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100"
                        />
                    </div>
                )}
            </nav>

            <div className="p-4 border-t border-gray-100 space-y-2">
                <KioskActivateButton />
                <KioskExitButton />
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

function SidebarLink({ 
    item, 
    isActive, 
    subtle = false,
    className = "" 
}: { 
    item: any, 
    isActive: boolean, 
    subtle?: boolean,
    className?: string
}) {
    return (
        <Link
            href={item.href}
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                isActive
                    ? "bg-black text-white shadow-lg shadow-gray-200 font-bold scale-[1.02]"
                    : cn(
                        "text-gray-500 hover:bg-gray-50 hover:text-black font-medium",
                        subtle && "py-2.5 px-6"
                    ),
                className
            )}
        >
            <item.icon
                size={subtle ? 18 : 20}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-black transition-colors'}
            />
            <span className={cn("text-sm", subtle && "text-xs")}>{item.name}</span>
            {isActive && (
                <motion.div 
                    layoutId="active-pill"
                    className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}
        </Link>
    )
}