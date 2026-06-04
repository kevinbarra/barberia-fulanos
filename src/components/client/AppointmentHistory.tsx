'use client';

import { Calendar, CheckCircle, XCircle, AlertTriangle, Clock, User } from 'lucide-react';
import Image from 'next/image';

// Flexible type for Supabase data
type BookingData = Record<string, unknown>;

interface AppointmentHistoryProps {
    bookings: BookingData[];
}

const STATUS_CONFIG = {
    completed: {
        label: 'Completada',
        color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        icon: CheckCircle,
    },
    cancelled: {
        label: 'Cancelada',
        color: 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/30',
        icon: XCircle,
    },
    no_show: {
        label: 'No asistió',
        color: 'bg-red-500/10 text-red-400 border border-red-500/20',
        icon: AlertTriangle,
    },
};

export default function AppointmentHistory({ bookings }: AppointmentHistoryProps) {
    if (!bookings || bookings.length === 0) {
        return (
            <div className="bg-zinc-900/50 rounded-3xl border border-zinc-800/50 p-8 text-center backdrop-blur-sm">
                <Calendar size={40} className="mx-auto text-zinc-700 mb-3 animate-pulse" />
                <h3 className="font-bold text-white mb-1">Sin historial</h3>
                <p className="text-sm text-zinc-500">Tus citas pasadas aparecerán aquí</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {bookings.map((booking) => {
                // Safe accessors for Supabase joined data
                const services = booking.services as Record<string, unknown> | Record<string, unknown>[] | undefined;
                const serviceName = Array.isArray(services)
                    ? (services[0]?.name as string)
                    : (services?.name as string) || 'Servicio';

                const profiles = booking.profiles as Record<string, unknown> | Record<string, unknown>[] | undefined;
                const staffName = Array.isArray(profiles)
                    ? (profiles[0]?.full_name as string)
                    : (profiles?.full_name as string) || 'Staff';
                const staffAvatar = Array.isArray(profiles)
                    ? (profiles[0]?.avatar_url as string)
                    : (profiles?.avatar_url as string);

                const status = booking.status as string;
                const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.completed;
                const StatusIcon = statusConfig.icon;

                const dateObj = new Date(booking.start_time as string);
                const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                const dateStr = dateObj.toLocaleDateString('es-MX', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                });

                const isCancelled = status === 'cancelled';

                return (
                    <div
                        key={booking.id as string}
                        className={`bg-zinc-900/40 rounded-2xl border border-zinc-800/50 p-4 transition-all hover:bg-zinc-900/60 backdrop-blur-sm ${
                            isCancelled ? 'opacity-50' : ''
                        }`}
                    >
                        <div className="flex items-center justify-between gap-4">
                            {/* Left: Service & Staff */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 flex-shrink-0">
                                    {staffAvatar ? (
                                        <Image src={staffAvatar} alt={staffName} width={40} height={40} className="object-cover" />
                                    ) : (
                                        <User size={18} className="text-zinc-500" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className={`font-bold text-sm text-zinc-200 truncate ${isCancelled ? 'line-through text-zinc-500' : ''}`}>
                                        {serviceName}
                                    </h4>
                                    <p className="text-xs text-zinc-500 truncate">
                                        con {staffName.split(' ')[0]}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Date & Status */}
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                <span className={`${statusConfig.color} px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1`}>
                                    <StatusIcon size={10} />
                                    {statusConfig.label}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wide font-bold">
                                    <Clock size={10} />
                                    <span className="capitalize">{dateStr}</span>
                                    <span>•</span>
                                    <span>{timeStr}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
