'use client'

import { Calendar, CheckCircle, XCircle, AlertTriangle, Clock, User } from 'lucide-react'
import Image from 'next/image'

// Flexible type for Supabase data
type BookingData = Record<string, unknown>

interface AppointmentHistoryProps {
    bookings: BookingData[]
}

const STATUS_CONFIG = {
    completed: {
        label: 'Completada',
        color: 'bg-green-100 text-green-700',
        icon: CheckCircle,
    },
    cancelled: {
        label: 'Cancelada',
        color: 'bg-gray-100 text-gray-500',
        icon: XCircle,
    },
    no_show: {
        label: 'No asistió',
        color: 'bg-red-100 text-red-700',
        icon: AlertTriangle,
    },
}

export default function AppointmentHistory({ bookings }: AppointmentHistoryProps) {
    if (!bookings || bookings.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">Sin historial</h3>
                <p className="text-sm text-gray-500">Tus citas pasadas aparecerán aquí</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {bookings.map((booking) => {
                // Safe accessors for Supabase joined data
                const services = booking.services as Record<string, unknown> | Record<string, unknown>[] | undefined
                const serviceName = Array.isArray(services)
                    ? (services[0]?.name as string)
                    : (services?.name as string) || 'Servicio'

                const profiles = booking.profiles as Record<string, unknown> | Record<string, unknown>[] | undefined
                const staffName = Array.isArray(profiles)
                    ? (profiles[0]?.full_name as string)
                    : (profiles?.full_name as string) || 'Staff'
                const staffAvatar = Array.isArray(profiles)
                    ? (profiles[0]?.avatar_url as string)
                    : (profiles?.avatar_url as string)

                const status = booking.status as string
                const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.completed
                const StatusIcon = statusConfig.icon

                const dateObj = new Date(booking.start_time as string)
                const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                const dateStr = dateObj.toLocaleDateString('es-MX', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })

                const isCancelled = status === 'cancelled'

                return (
                    <div
                        key={booking.id as string}
                        className={`bg-white rounded-xl border border-gray-100 p-4 transition-all hover:border-gray-200 ${isCancelled ? 'opacity-60' : ''}`}
                    >
                        <div className="flex items-center justify-between gap-4">
                            {/* Left: Service & Staff */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 flex-shrink-0">
                                    {staffAvatar ? (
                                        <Image src={staffAvatar} alt={staffName} width={40} height={40} className="object-cover" />
                                    ) : (
                                        <User size={18} className="text-gray-400" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className={`font-bold text-gray-900 truncate ${isCancelled ? 'line-through' : ''}`}>
                                        {serviceName}
                                    </h4>
                                    <p className="text-xs text-gray-500 truncate">
                                        con {staffName.split(' ')[0]}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Date & Status */}
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className={`${statusConfig.color} px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1`}>
                                    <StatusIcon size={10} />
                                    {statusConfig.label}
                                </span>
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock size={10} />
                                    <span className="capitalize">{dateStr}</span>
                                    <span>•</span>
                                    <span>{timeStr}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
