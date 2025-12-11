'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Plus, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Premium Bottom Navigation - Material Design 3 Inspired
 * 
 * Best practices implemented:
 * 1. Full-width bar with equal distribution (justify-evenly)
 * 2. 4 items max (recommended range: 3-5)
 * 3. Labels for clarity on active state
 * 4. Primary action (Plus) elevated but not oversized
 * 5. Clear visual feedback on active/inactive states
 * 6. Large tap targets (48px minimum)
 */
export default function BottomNav({ tenantSlug, role }: { tenantSlug: string, role?: string }) {
    const pathname = usePathname();
    const isAdmin = role === 'owner' || role === 'staff' || role === 'super_admin';

    const bookingHref = tenantSlug ? `/book/${tenantSlug}` : '#';

    // Base menu items for all users
    const menuItems = [
        { name: 'Inicio', href: '/app', icon: Home },
        { name: 'Agendar', href: bookingHref, icon: Plus, isSpecial: true },
        { name: 'Perfil', href: '/app/profile', icon: User },
    ];

    // Add Admin button for staff/owners (insert at position 1: after Home)
    if (isAdmin) {
        menuItems.splice(1, 0, { name: 'Admin', href: '/admin', icon: ShieldCheck });
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
            {/* Full-width navigation bar */}
            <div className="bg-zinc-950/95 backdrop-blur-xl border-t border-white/10">
                <div className="flex items-end justify-evenly h-16 px-2">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href === '/admin' && pathname.startsWith('/admin'));

                        // Primary Action Button (Agendar)
                        if (item.isSpecial) {
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex flex-col items-center justify-center -mt-4"
                                >
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30"
                                    >
                                        <Plus size={26} className="text-white" strokeWidth={2.5} />
                                    </motion.div>
                                </Link>
                            );
                        }

                        // Standard Navigation Items
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex flex-col items-center justify-center min-w-[64px] h-full py-2"
                            >
                                <motion.div
                                    whileTap={{ scale: 0.9 }}
                                    className="flex flex-col items-center gap-1"
                                >
                                    <div className={`p-1 rounded-full transition-all duration-200 ${isActive
                                            ? 'bg-blue-600/20'
                                            : ''
                                        }`}>
                                        <item.icon
                                            size={22}
                                            strokeWidth={isActive ? 2.5 : 1.8}
                                            className={`transition-colors duration-200 ${isActive
                                                    ? 'text-blue-400'
                                                    : 'text-zinc-500'
                                                }`}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive
                                            ? 'text-blue-400'
                                            : 'text-zinc-500'
                                        }`}>
                                        {item.name}
                                    </span>
                                </motion.div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
