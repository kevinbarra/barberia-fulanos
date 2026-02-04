'use client'

import { useState } from 'react'
import { Calendar, MapPin, XCircle, Loader2, User } from 'lucide-react'
import Image from 'next/image'
import { cancelMyBooking } from '@/app/app/actions'
import { toast } from 'sonner'
import QRPresentation from './QRPresentation'

// Interfaces estrictas para robustez
interface Profile {
    full_name: string | null;
    avatar_url: string | null;
    email?: string;
}

interface Service {
    name: string;
    price: number;
    duration_min?: number;
}

interface BookingData {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    guest_name?: string | null;
    services: Service | Service[] | null;
    profiles: Profile | Profile[] | null; // Staff
    customer?: Profile | null;
}

export default function NextAppointmentCard({
    booking,
    userProfileName = ''
}: {
    booking: unknown;
    userProfileName?: string;
}) {
    const [isCancelling, setIsCancelling] = useState(false)
    // Casteo seguro
    const safeBooking = booking as BookingData;

    // Normalización de datos (Defensive Programming)
    const getService = (): Service => {
        if (Array.isArray(safeBooking.services)) return safeBooking.services[0];
        return safeBooking.services as Service || { name: 'Servicio General', price: 0 };
    }

    const getStaff = (): Profile => {
        if (Array.isArray(safeBooking.profiles)) return safeBooking.profiles[0];
        return safeBooking.profiles as Profile || { full_name: 'Staff', avatar_url: null };
    }

    const handleCancel = async () => {
        if (!confirm('¿Estás seguro de que quieres cancelar tu cita?')) return
        setIsCancelling(true)
        try {
            const res = await cancelMyBooking(safeBooking.id)
            if (res?.success) toast.success(res.message)
            else toast.error(res?.error || 'No se pudo cancelar')
        } catch {
            toast.error('Error de conexión')
        } finally {
            setIsCancelling(false)
        }
    }

    const service = getService();
    const staff = getStaff();

    // Check if booking is for someone else ("booking for a friend")
    const bookingForName = safeBooking.guest_name || '';
    const isBookingForOther = bookingForName &&
        userProfileName &&
        bookingForName.toLowerCase().trim() !== userProfileName.toLowerCase().trim();

    // Formateo Local (MX)
    const dateObj = new Date(safeBooking.start_time)
    const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    const dateStr = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

    return (
        <div className="w-full max-w-md mx-auto md:max-w-2xl lg:max-w-3xl mb-8 transition-all duration-300">
            {/* Contenedor Premium Glassmorphism */}
            <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl p-[1px] shadow-2xl border-t border-white/10">
                <div className="bg-zinc-900/95 rounded-[23px] p-5 relative overflow-hidden backdrop-blur-md">

                    {/* Decoración de Fondo */}
                    <div className="absolute -right-12 -top-12 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

                    {/* Header */}
                    <div className="flex items-start justify-between mb-6 relative z-10">
                        <div className="flex-1 pr-4">
                            <h3 className="text-2xl font-bold text-white mb-2 leading-tight">{service.name}</h3>

                            {/* IDENTITY CONTEXT: Show "Para: Name" if booking for someone else */}
                            {isBookingForOther && (
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
                                        Para: {bookingForName}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center gap-3 text-zinc-400 text-sm">
                                <div className="relative w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0">
                                    {staff.avatar_url ? (
                                        <Image src={staff.avatar_url} alt="Staff" fill className="object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full w-full"><User size={16} /></div>
                                    )}
                                </div>
                                <span className="font-medium truncate">con {staff.full_name?.split(' ')[0]}</span>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center min-w-[80px] backdrop-blur-sm">
                            <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Hora</span>
                            <span className="block text-xl font-bold text-white tracking-tight">{timeStr}</span>
                        </div>
                    </div>

                    {/* QR Section */}
                    <div className="mb-6 relative z-10 w-full flex justify-center">
                        <QRPresentation
                            qrValue={safeBooking.id}
                            clientName={safeBooking.customer?.full_name || 'Cliente'}
                            points={0}
                        />
                    </div>

                    {/* Footer Info */}
                    <div className="space-y-4 border-t border-white/5 pt-5 relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <Calendar size={16} className="text-blue-500" />
                                    <span className="capitalize font-medium">{dateStr}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <MapPin size={16} className="text-purple-500" />
                                    <span className="font-medium">Sucursal Centro</span>
                                </div>
                            </div>
                            <button
                                onClick={handleCancel}
                                disabled={isCancelling}
                                className="group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all duration-200 disabled:opacity-50 w-full sm:w-auto"
                            >
                                {isCancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} className="group-hover:scale-110 transition-transform" />}
                                Cancelar Cita
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}