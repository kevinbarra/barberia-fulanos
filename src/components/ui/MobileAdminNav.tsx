import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, CalendarDays, Wallet, ShieldCheck, User, LogOut, 
    Scissors, Clock, Settings, Users, BarChart3, Menu, X, RefreshCw, 
    Receipt, Lock, ChevronDown, Layers, Type, Palette, Landmark, Globe 
} from 'lucide-react';
import { signOut } from '@/app/auth/actions';
import { motion, AnimatePresence } from 'framer-motion';
import RealtimeBookingNotifications from '@/components/admin/RealtimeBookingNotifications';
import { useKioskMode } from '@/components/admin/KioskModeProvider';
import KioskExitButton from '@/components/admin/KioskExitButton';
import KioskActivateButton from '@/components/admin/KioskActivateButton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ZERO TRUST: Define grouped routes (Mirror of Sidebar.tsx)
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
];

export default function MobileAdminNav({ 
    role, 
    tenantId, 
    tenantName = 'AgendaBarber',
    isMainDomain = false 
}: { 
    role: string; 
    tenantId: string; 
    tenantName?: string;
    isMainDomain?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        'Operaciones': true,
        'Gestión de Equipo': false,
        'Configuración': false,
        'Finanzas': false
    });
    
    const pathname = usePathname();
    const { isKioskMode } = useKioskMode();

    const toggleMenu = () => setIsOpen(!isOpen);
    const toggleGroup = (name: string) => {
        setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));
    };

    return (
        <div className="lg:hidden">
            {/* Top Bar fixed */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40 shadow-sm">
                <div className="flex items-center gap-2">
                    <h1 className="font-black text-xl tracking-tighter text-gray-900 uppercase">
                        {tenantName.length > 10 ? tenantName.slice(0, 10) + '.' : tenantName}<span className="text-blue-600">.</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <KioskActivateButton />
                    <KioskExitButton />
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
                            className="fixed inset-0 bg-black/50 z-[99] backdrop-blur-sm"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-16 left-0 bottom-0 w-72 bg-white border-r border-gray-200 z-[100] flex flex-col shadow-xl"
                        >
                            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto pb-20">
                                <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mb-4 uppercase px-4">
                                    {isKioskMode ? '🔒 Modo Kiosco' : 'Sistema Admin'}
                                </p>

                                {/* Dashboard always visible */}
                                <MobileMenuLink 
                                    item={{ name: 'Dashboard', href: '/admin', icon: LayoutDashboard }} 
                                    isActive={pathname === '/admin'}
                                    onClick={() => setIsOpen(false)}
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
                                        const isAnyActive = allowedItems.some(i => pathname === i.href)

                                        return (
                                            <div key={group.name} className="space-y-1">
                                                <button
                                                    onClick={() => toggleGroup(group.name)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-4 py-2 mt-2 text-[10px] font-black uppercase tracking-widest transition-colors",
                                                        isAnyActive ? "text-black" : "text-gray-400 hover:text-gray-600"
                                                    )}
                                                >
                                                    {group.name}
                                                    <ChevronDown 
                                                        size={12} 
                                                        className={cn("transition-transform duration-200", isGroupOpen ? "" : "-rotate-90")} 
                                                    />
                                                </button>
                                                
                                                <AnimatePresence initial={false}>
                                                    {(isGroupOpen || isAnyActive) && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden space-y-1"
                                                        >
                                                            {allowedItems.map(item => (
                                                                <MobileMenuLink 
                                                                    key={item.href} 
                                                                    item={item} 
                                                                    isActive={pathname === item.href}
                                                                    onClick={() => setIsOpen(false)}
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
                                        <MobileMenuLink 
                                            key={item.href} 
                                            item={item} 
                                            isActive={pathname === item.href}
                                            onClick={() => setIsOpen(false)}
                                        />
                                    ))
                                )}

                                {/* Platform Management */}
                                {role === 'super_admin' && isMainDomain && !isKioskMode && (
                                    <div className="pt-4 mt-4 border-t border-gray-100">
                                        <MobileMenuLink 
                                            item={{ name: 'Platform Control', href: '/admin/platform', icon: Globe }} 
                                            isActive={pathname === '/admin/platform'}
                                            onClick={() => setIsOpen(false)}
                                            className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                                        />
                                    </div>
                                )}
                            </nav>

                            <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0 z-10 space-y-2">
                                <button
                                    onClick={() => {
                                        toast.info('Sincronizando sistema...')
                                        setTimeout(() => window.location.reload(), 500)
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-100 w-full transition-all text-sm font-medium"
                                >
                                    <RefreshCw size={18} />
                                    Sincronizar
                                </button>
                                <button
                                    onClick={() => signOut()}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 w-full transition-all text-sm font-bold"
                                >
                                    <LogOut size={18} />
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

function MobileMenuLink({ 
    item, 
    isActive, 
    onClick, 
    subtle = false,
    className = "" 
}: { 
    item: any, 
    isActive: boolean, 
    onClick: () => void,
    subtle?: boolean,
    className?: string
}) {
    return (
        <Link
            href={item.href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                isActive
                    ? 'bg-black text-white shadow-lg font-bold'
                    : cn(
                        'text-gray-500 hover:bg-gray-50 hover:text-black font-medium',
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
                 <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />
            )}
        </Link>
    );
}
