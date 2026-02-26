'use client'

import { useState } from 'react'
import { Calendar, MapPin, XCircle, Loader2, User, CalendarPlus, ExternalLink, Clock } from 'lucide-react'
import Image from 'next/image'
import { cancelMyBooking } from '@/app/app/actions'
import { toast } from 'sonner'

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
    end_time?: string;
    status: string;
    guest_name?: string | null;
    services: Service | Service[] | null;
    profiles: Profile | Profile[] | null; // Staff
    customer?: Profile | null;
}

// Generate Google Calendar link
function generateCalendarLink(booking: BookingData, service: Service, staff: Profile): string {
    const startDate = new Date(booking.start_time);
    const duration = service.duration_min || 30;
    const endDate = new Date(startDate.getTime() + duration * 60000);

    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `${service.name} - Cita`,
        dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
        details: `Tu cita con ${staff.full_name || 'Staff'}.\n\nServicio: ${service.name}\nPrecio: $${service.price}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Cancellation buffer: 2 hours before appointment
const CANCELLATION_BUFFER_MS = 2 * 60 * 60 * 1000;

export default function NextAppointmentCard({
    booking,
    userProfileName = ''
}: {
    booking: unknown;
    userProfileName?: string;
}) {
    const [isCancelling, setIsCancelling] = useState(false)
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

    const service = getService();
    const staff = getStaff();

    // CANCELLATION PROTECTION: Disable if less than 2 hours away
    const startTime = new Date(safeBooking.start_time).getTime();
    const now = Date.now();
    const canCancel = startTime - now > CANCELLATION_BUFFER_MS;
    const timeUntilAppointment = startTime - now;
    const hoursUntil = Math.floor(timeUntilAppointment / (60 * 60 * 1000));
    const minutesUntil = Math.floor((timeUntilAppointment % (60 * 60 * 1000)) / (60 * 1000));

    const handleCancel = async () => {
        if (!canCancel) {
            toast.error('No puedes cancelar con menos de 2 horas de anticipación')
            return
        }
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

    // Check if booking is for someone else ("booking for a friend")
    const bookingForName = safeBooking.guest_name || '';
    const isBookingForOther = bookingForName &&
        userProfileName &&
        bookingForName.toLowerCase().trim() !== userProfileName.toLowerCase().trim();

    // Calendar link
    const calendarUrl = generateCalendarLink(safeBooking, service, staff);

    // Formateo Local (MX)
    const dateObj = new Date(safeBooking.start_time)
    const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    const dateStr = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

    return (
        <div className="w-full max-w-md mx-auto md:max-w-2xl lg:max-w-3xl mb-4 transition-all duration-300">
            {/* Contenedor Premium Glassmorphism */}
            <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl p-[1px] shadow-2xl border-t border-white/10">
                <div className="bg-zinc-900/95 rounded-[23px] p-5 relative overflow-hidden backdrop-blur-md">

                    {/* Decoración de Fondo */}
                    <div className="absolute -right-12 -top-12 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

                    {/* Header */}
                    <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="flex-1 pr-4">
                            <h3 className="text-xl font-bold text-white mb-2 leading-tight">{service.name}</h3>

                            {/* IDENTITY CONTEXT: Show "Para: Name" if booking for someone else */}
                            {isBookingForOther && (
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
                                        Para: {bookingForName}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center gap-3 text-zinc-400 text-sm">
                                <div className="relative w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0">
                                    {staff.avatar_url ? (
                                        <Image src={staff.avatar_url} alt="Staff" fill className="object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full w-full"><User size={14} /></div>
                                    )}
                                </div>
                                <span className="font-medium truncate text-xs">con {staff.full_name?.split(' ')[0]}</span>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center min-w-[70px] backdrop-blur-sm">
                            <span className="block text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Hora</span>
                            <span className="block text-lg font-bold text-white tracking-tight">{timeStr}</span>
                        </div>
                    </div>

                    {/* Date & Location Row */}
                    <div className="flex items-center gap-4 mb-4 text-xs text-zinc-400 relative z-10">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-blue-500" />
                            <span className="capitalize font-medium">{dateStr}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-purple-500" />
                            <span className="font-medium">Sucursal Lázaro Cárdenas</span>
                        </div>
                    </div>

                    {/* Time Until Appointment Badge */}
                    {timeUntilAppointment > 0 && timeUntilAppointment < 24 * 60 * 60 * 1000 && (
                        <div className="mb-4 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20 relative z-10">
                            <Clock size={14} />
                            <span className="font-medium">
                                {hoursUntil > 0 ? `En ${hoursUntil}h ${minutesUntil}m` : `En ${minutesUntil} minutos`}
                            </span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 relative z-10 border-t border-white/5 pt-4">
                        {/* Add to Calendar */}
                        <a
                            href={calendarUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
                        >
                            <CalendarPlus size={14} />
                            Añadir a Calendario
                            <ExternalLink size={10} className="opacity-50" />
                        </a>

                        {/* Cancel Button - Protected */}
                        {canCancel ? (
                            <button
                                onClick={handleCancel}
                                disabled={isCancelling}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-50"
                            >
                                {isCancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                Cancelar
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-500 bg-zinc-800/50 border border-zinc-700/50 cursor-not-allowed">
                                <XCircle size={14} />
                                <span className="hidden sm:inline">No cancelable</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}