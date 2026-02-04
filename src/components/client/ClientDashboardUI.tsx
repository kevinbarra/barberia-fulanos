'use client';

import { useState } from 'react';
import Link from "next/link";
import { Settings, User, Plus, LogOut, LayoutDashboard, History, Calendar, CalendarDays } from "lucide-react";
import Image from "next/image";
import LoyaltyRewards from '@/components/client/LoyaltyRewards';
import QRPresentation from '@/components/client/QRPresentation';
import NextAppointmentCard from "@/components/client/NextAppointmentCard";
import AppointmentHistory from "@/components/client/AppointmentHistory";
import { motion } from 'framer-motion';
import { signOut } from '@/app/auth/actions';
import { useRealtimePoints } from '@/hooks/useRealtimePoints';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';

// Flexible types for Supabase data
interface ClientDashboardUIProps {
    user: { id: string; email?: string };
    profile: Record<string, unknown> | null;
    role: string;
    upcomingBookings: Record<string, unknown>[];
    pastBookings: Record<string, unknown>[];
    history: Record<string, unknown>[];
    loyaltyStatus: {
        success: boolean;
        data?: {
            current_points: number;
            available_rewards: Record<string, unknown>[];
        };
        error?: string;
    };
    showNoShowAlert: boolean;
    tenantSlug: string;
}

export default function ClientDashboardUI({
    user,
    profile,
    role,
    upcomingBookings,
    pastBookings,
    history,
    loyaltyStatus,
    showNoShowAlert,
    tenantSlug
}: ClientDashboardUIProps) {

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const isStaffOrOwner = role === 'owner' || role === 'staff' || role === 'super_admin';

    // Safe accessors
    const profileName = (profile?.full_name as string) || 'Cliente';
    const avatarUrl = profile?.avatar_url as string | undefined;
    const noShowCount = (profile?.no_show_count as number) || 0;

    // Realtime points subscription - updates instantly when staff assigns points via QR
    const initialPoints = loyaltyStatus.data?.current_points || 0;
    const realtimePoints = useRealtimePoints(user.id, initialPoints);

    // Realtime bookings subscription - updates when staff changes booking status
    useRealtimeBookings({ customerId: user.id });

    // LIFECYCLE TABS STATE
    const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 pb-32 relative overflow-hidden selection:bg-blue-500/30">

            {/* Aurora Backgrounds */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.2, 0.3, 0.2]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-10%] left-[-20%] w-[350px] h-[350px] bg-blue-600/30 blur-[120px] rounded-full pointer-events-none"
            />
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-[-10%] right-[-20%] w-[300px] h-[300px] bg-purple-600/20 blur-[100px] rounded-full pointer-events-none"
            />

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="relative z-10 max-w-sm mx-auto flex flex-col min-h-[90vh]"
            >

                {/* HEADER */}
                <motion.div variants={item} className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-xl font-bold capitalize bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            Hola, {profileName.split(" ")[0]}
                        </h1>
                        <p className="text-zinc-500 text-xs font-medium mb-3">Bienvenido a tu barbería</p>

                        <div className="flex gap-2">
                            {isStaffOrOwner && (
                                <Link href="/admin">
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 text-[10px] font-bold text-zinc-300 transition-colors backdrop-blur-md"
                                    >
                                        <LayoutDashboard size={12} />
                                        <span>ADMIN</span>
                                    </motion.button>
                                </Link>
                            )}

                            <button
                                onClick={() => signOut()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-[10px] font-bold text-red-400 transition-colors backdrop-blur-md"
                            >
                                <LogOut size={12} />
                                <span>SALIR</span>
                            </button>
                        </div>
                    </div>

                    <Link href="/app/profile" className="relative group">
                        <motion.div
                            whileTap={{ scale: 0.95 }}
                            className="w-12 h-12 rounded-full overflow-hidden border-2 border-zinc-800 group-hover:border-white transition-colors bg-zinc-900 flex items-center justify-center shadow-lg"
                        >
                            {avatarUrl ? (
                                <Image src={avatarUrl} alt="Avatar" width={48} height={48} className="object-cover" />
                            ) : (
                                <User className="w-6 h-6 text-zinc-500" />
                            )}
                        </motion.div>
                        <div className="absolute -bottom-1 -right-1 bg-zinc-800 p-1 rounded-full border border-black shadow-sm">
                            <Settings size={10} className="text-white" />
                        </div>
                    </Link>
                </motion.div>

                {/* ALERTA DE NO-SHOW */}
                {showNoShowAlert && (
                    <motion.div variants={item} className="mb-6">
                        <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 flex items-start gap-3 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                <span className="text-xl">⚠️</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-red-500">Cita Cancelada</h3>
                                <p className="text-sm text-red-200 mt-1">
                                    Tu cita reciente fue marcada como <strong>no presentado</strong>.
                                    {noShowCount > 0 && (
                                        <span className="block mt-1">
                                            Tienes <strong>{noShowCount} faltas</strong> en tu historial.
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* VISUALIZADOR DE ESTADO DE CUENTA (WARNINGS) */}
                {noShowCount > 0 && !showNoShowAlert && (
                    <motion.div variants={item} className="mb-6 px-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-500/80 bg-orange-500/10 py-2 px-3 rounded-lg border border-orange-500/20 w-fit backdrop-blur-sm">
                            <span>⚠️</span>
                            <span>{noShowCount} falta(s) registrada(s)</span>
                        </div>
                    </motion.div>
                )}

                {/* LIFECYCLE TABS */}
                <motion.div variants={item} className="mb-6">
                    <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'upcoming'
                                ? 'bg-white text-black shadow-lg'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                                }`}
                        >
                            <CalendarDays size={16} />
                            Próximas
                            {upcomingBookings.length > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'upcoming' ? 'bg-green-500 text-white' : 'bg-zinc-700 text-zinc-300'
                                    }`}>
                                    {upcomingBookings.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'history'
                                ? 'bg-white text-black shadow-lg'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                                }`}
                        >
                            <History size={16} />
                            Historial
                        </button>
                    </div>
                </motion.div>

                {/* TAB CONTENT */}
                {activeTab === 'upcoming' ? (
                    <motion.div variants={item} className="mb-6">
                        {upcomingBookings.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingBookings.map((booking, index) => (
                                    <NextAppointmentCard
                                        key={(booking.id as string) || index}
                                        booking={booking}
                                        userProfileName={(profile?.full_name as string) || ''}
                                    />
                                ))}
                            </div>
                        ) : (
                            /* EMPTY STATE WITH CONVERSION CTA */
                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-8 text-center backdrop-blur-sm">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Calendar size={28} className="text-zinc-500" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No tienes citas activas</h3>
                                <p className="text-sm text-zinc-500 mb-6">Reserva tu próxima visita en segundos</p>
                                <Link
                                    href={`/book/${tenantSlug}`}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-all active:scale-95"
                                >
                                    <Plus size={18} />
                                    Reservar Ahora
                                </Link>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div variants={item} className="mb-6">
                        <AppointmentHistory bookings={pastBookings} />
                    </motion.div>
                )}

                {/* Sección de Lealtad */}
                <motion.section variants={item} className="mb-6">
                    {loyaltyStatus.success && loyaltyStatus.data ? (
                        <LoyaltyRewards
                            currentPoints={loyaltyStatus.data.current_points}
                            rewards={loyaltyStatus.data.available_rewards as unknown as Parameters<typeof LoyaltyRewards>[0]['rewards']}
                        />
                    ) : (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 backdrop-blur-sm">
                            <p className="text-sm text-yellow-500">
                                No se pudo cargar tu información de recompensas.
                            </p>
                        </div>
                    )}
                </motion.section>

                {/* QR Code */}
                <motion.div variants={item} className="mb-6">
                    <QRPresentation
                        qrValue={user.id}
                        clientName={profileName}
                        points={realtimePoints}
                    />
                </motion.div>

                {/* HISTORIAL TRANSACCIONES */}
                <motion.div variants={item} className="flex-1">
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4 pl-1">Puntos Ganados</h3>
                    <div className="space-y-3">
                        {!history || history.length === 0 ? (
                            <div className="text-center py-8"><p className="text-zinc-600 text-sm">Tu historial aparecerá aquí.</p></div>
                        ) : (
                            history.map((tx, i) => {
                                const services = tx.services as Record<string, unknown> | Record<string, unknown>[] | undefined;
                                const serviceName = Array.isArray(services) ? (services[0]?.name as string) : (services?.name as string) || 'Servicio';
                                const amount = tx.amount as number || 0;
                                const pointsEarned = tx.points_earned as number || 0;
                                const createdAt = tx.created_at as string;

                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * i }}
                                        className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl hover:bg-zinc-900/60 transition-colors backdrop-blur-sm"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center text-zinc-400 text-sm font-bold shadow-sm">
                                                {serviceName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-zinc-200">{serviceName}</p>
                                                <p className="text-[10px] text-zinc-500 uppercase font-medium tracking-wide">
                                                    {new Date(createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-green-400 font-bold text-xs bg-green-400/10 px-2 py-0.5 rounded-md mb-1">+{pointsEarned} pts</span>
                                            <span className="text-[10px] text-zinc-600 font-medium">${amount}</span>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
