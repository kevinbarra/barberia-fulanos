'use client'

import { useState } from 'react'
import { Calendar, MapPin, XCircle, Loader2, User } from 'lucide-react'
import Image from 'next/image'
import { cancelMyBooking } from '@/app/app/actions'
import { toast } from 'sonner'

// Flexible type for Supabase data
type BookingData = Record<string, unknown>;

export default function NextAppointmentCard({ booking }: { booking: BookingData }) {
    const [isCancelling, setIsCancelling] = useState(false)

    const handleCancel = async () => {
        if (!confirm('¿Estás seguro de que quieres cancelar tu cita?')) return

        setIsCancelling(true)
        const res = await cancelMyBooking(booking.id as string)

        if (res?.success) {
            toast.success(res.message)
        } else {
            toast.error(res?.error || 'Error al cancelar')
        }
        setIsCancelling(false)
    }

    // Safe accessors for Supabase joined data
    const services = booking.services as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const serviceName = Array.isArray(services) ? (services[0]?.name as string) : (services?.name as string) || 'Servicio';

    const profiles = booking.profiles as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const staffName = Array.isArray(profiles) ? (profiles[0]?.full_name as string) : (profiles?.full_name as string) || 'Staff';
    const staffAvatar = Array.isArray(profiles) ? (profiles[0]?.avatar_url as string) : (profiles?.avatar_url as string);

    const dateObj = new Date(booking.start_time as string)
    const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    const dateStr = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

    return (
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl p-1 shadow-2xl border border-zinc-700/50 mb-8">
            <div className="bg-zinc-900/90 rounded-[22px] p-5 relative overflow-hidden backdrop-blur-sm">

                {/* Decoración */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

                {/* Header Tarjeta */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-1">{serviceName}</h3>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                                {staffAvatar ? (
                                    <Image src={staffAvatar} alt="Staff" width={24} height={24} className="object-cover" />
                                ) : <User size={14} />}
                            </div>
                            <span>con {staffName.split(' ')[0]}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="bg-white/10 p-2 rounded-xl text-center min-w-[70px]">
                            <span className="block text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Hora</span>
                            <span className="block text-xl font-bold text-white">{timeStr}</span>
                        </div>
                    </div>
                </div>

                {/* Info y Botones */}
                <div className="space-y-4 border-t border-white/10 pt-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <Calendar size={16} className="text-blue-500" />
                            <span className="capitalize">{dateStr}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center gap-3">
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <MapPin size={16} className="text-purple-500" />
                            <span>Sucursal Centro</span>
                        </div>

                        {/* BOTÓN CANCELAR */}
                        <button
                            onClick={handleCancel}
                            disabled={isCancelling}
                            className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isCancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}