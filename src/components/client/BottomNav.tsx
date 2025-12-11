'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Plus, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BottomNav({ tenantSlug, role }: { tenantSlug: string, role?: string }) {
    const pathname = usePathname();
    const isAdmin = role === 'owner' || role === 'staff' || role === 'super_admin';

    // DEBUG: Verificar qué llega al cliente
    console.log('[CLIENT NAV] Received TenantSlug:', tenantSlug);

    const bookingHref = tenantSlug ? `/book/${tenantSlug}` : '#';

    const menuItems = [
        { name: 'Inicio', href: '/app', icon: Home },
        { name: 'Agendar', href: bookingHref, icon: Plus, isSpecial: true },
        { name: 'Perfil', href: '/app/profile', icon: User },
    ];

    if (isAdmin) {
        // Insert Admin button before Profile
        menuItems.splice(2, 0, { name: 'Admin', href: '/admin', icon: ShieldCheck });
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe pointer-events-none flex justify-center">
            {/* 
                Usamos un contenedor flotante con glassmorphism estilo iOS/Premium
                pointer-events-auto para que solo la barra sea interactiva y no bloquee clicks laterales si es angosta
            */}
            <div className="pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/10 text-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-8 mb-2">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;

                    if (item.isSpecial) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative -top-5"
                            >
                                <motion.div
                                    whileTap={{ scale: 0.9 }}
                                    className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/40 border-4 border-zinc-950"
                                >
                                    <Plus size={28} className="text-white" strokeWidth={3} />
                                </motion.div>
                            </Link>
                        )
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center w-12"
                        >
                            <motion.div
                                whileTap={{ scale: 0.8 }}
                                className={`flex flex-col items-center gap-1 transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <item.icon
                                    size={24}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}
                                />
                                {isActive && (
                                    <motion.div
                                        layoutId="activeDot"
                                        className="absolute -bottom-2 w-1 h-1 bg-white rounded-full"
                                    />
                                )}
                            </motion.div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
