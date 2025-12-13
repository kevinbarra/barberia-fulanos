'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Wallet, ShieldCheck, User, LogOut, Scissors, Clock, Settings, Users, BarChart3, Menu, X, RefreshCw, Receipt, Lock } from 'lucide-react';
import { signOut } from '@/app/auth/actions';
import { motion, AnimatePresence } from 'framer-motion';
import RealtimeBookingNotifications from '@/components/admin/RealtimeBookingNotifications';
import { useKioskMode } from '@/components/admin/KioskModeProvider';
import { toast } from 'sonner';

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
];

// KIOSK MODE: Only operational items - NO reports, settings, team management
const KIOSK_ALLOWED_MENU = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Agenda', href: '/admin/bookings', icon: CalendarDays },
    { name: 'Terminal POS', href: '/admin/pos', icon: Wallet },
    { name: 'Gastos', href: '/admin/expenses', icon: Receipt },
    { name: 'Horarios', href: '/admin/schedule', icon: Clock },
];

// STAFF: Limited access (no sensitive data)
const STAFF_MENU = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Agenda', href: '/admin/bookings', icon: CalendarDays },
    { name: 'Terminal POS', href: '/admin/pos', icon: Wallet },
    { name: 'Gastos', href: '/admin/expenses', icon: Receipt },
    { name: 'Clientes', href: '/admin/clients', icon: Users },
    { name: 'Horarios', href: '/admin/schedule', icon: Clock },
    { name: 'Ajustes', href: '/admin/profile', icon: User },
];

export default function MobileAdminNav({ role, tenantId, tenantName = 'AgendaBarber' }: { role: string; tenantId: string; tenantName?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { isKioskMode } = useKioskMode();

    // ZERO TRUST: Determine menu based on strictest applicable restriction
    const getMenuToRender = () => {
        // KIOSK MODE: Universal restriction - applies to EVERYONE including owners
        if (isKioskMode) {
            return KIOSK_ALLOWED_MENU;
        }

        // Staff: Limited access even when kiosk is off
        if (role === 'staff') {
            return STAFF_MENU;
        }

        // Owner, admin, super_admin: Full access (only when kiosk is OFF)
        return FULL_ADMIN_MENU;
    };

    const menuToRender = getMenuToRender();
    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <div className="lg:hidden">
            {/* Top Bar fixed */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40 shadow-sm">
                <div className="flex items-center gap-2">
                    <h1 className="font-black text-xl tracking-tighter text-gray-900 uppercase">
                        {tenantName.length > 10 ? tenantName.slice(0, 10) + '.' : tenantName}<span className="text-blue-600">.</span>
                    </h1>
                    {isKioskMode && (
                        <div className="bg-purple-100 p-1 rounded-lg" title="Modo Kiosco">
                            <Lock size={12} className="text-purple-600" />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Notification Bell for Mobile */}
                    {tenantId && (
                        <RealtimeBookingNotifications tenantId={tenantId} />
                    )}
                    <button
                        onClick={toggleMenu}
                        className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Spacer for content below header */}
            <div className="h-16" />

            {/* Drawer Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={toggleMenu}
                            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-50 flex flex-col shadow-xl"
                        >
                            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                                <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mb-4 uppercase px-4">
                                    {isKioskMode ? '🔒 Modo Kiosco' : 'Menú Admin'}
                                </p>
                                {menuToRender.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
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
                                    );
                                })}
                            </nav>

                            <div className="p-4 border-t border-gray-100 mb-safe space-y-2">
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
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
