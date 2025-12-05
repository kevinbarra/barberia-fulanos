'use client'

import { useState } from 'react'
import { toZonedTime, format } from 'date-fns-tz'
import { Clock, User, CheckCircle2, MoreHorizontal, Scissors } from 'lucide-react'
import CheckOutModal from './CheckOutModal'
import Image from 'next/image'

const TIMEZONE = 'America/Mexico_City';

// Tipo robusto para la UI
type BookingProps = {
    id: string;
    start_time: string;
    status: string;
    notes: string;
    services: { name: string; price: number; duration_min: number };
    profiles: { full_name: string; avatar_url: string | null };
}

export default function BookingCard({ booking }: { booking: BookingProps }) {
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // Formateo de hora
    const startDate = toZonedTime(booking.start_time, TIMEZONE);
    const timeStr = format(startDate, 'h:mm a', { timeZone: TIMEZONE });

    // Extracción de datos (fallback seguro)
    const clientName = booking.notes?.split('|')[0]?.replace('Cliente:', '').trim() || 'Cliente Anónimo';
    const staffName = booking.profiles?.full_name?.split(' ')[0] || 'Staff';
    const serviceName = booking.services?.name || 'Servicio';
    const price = booking.services?.price || 0;

    // Estados visuales
    const isCompleted = booking.status === 'completed';
    const isCancelled = booking.status === 'cancelled';

    return (
        <>
            <div
                onClick={() => !isCompleted && !isCancelled && setIsCheckoutOpen(true)}
                className={`group relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm transition-all hover:shadow-md active:scale-[0.99] cursor-pointer overflow-hidden ${isCompleted ? 'opacity-60 grayscale' : ''}`}
            >
                {/* Indicador lateral de estado */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isCompleted ? 'bg-green-500' : isCancelled ? 'bg-red-500' : 'bg-black'
                    }`} />

                <div className="flex justify-between items-start mb-3 pl-3">
                    <div>
                        <h4 className="font-bold text-gray-900 text-lg leading-tight">{clientName}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 font-medium">
                            <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                                <Clock size={10} /> {timeStr}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Scissors size={10} /> {serviceName}
                            </span>
                        </div>
                    </div>

                    {/* Precio o Status */}
                    <div className="text-right">
                        {isCompleted ? (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle2 size={10} /> Pagado
                            </span>
                        ) : (
                            <span className="font-black text-lg text-gray-900">${price}</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-50 pt-3 pl-3 mt-3">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden relative">
                            {booking.profiles?.avatar_url ? (
                                <Image src={booking.profiles.avatar_url} alt={staffName} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                                    {staffName.charAt(0)}
                                </div>
                            )}
                        </div>
                        <span className="text-xs text-gray-400 font-medium">Atiende {staffName}</span>
                    </div>

                    {!isCompleted && !isCancelled && (
                        <div className="text-xs font-bold text-blue-600 group-hover:underline">
                            Cobrar / Gestionar →
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Cobro (Reutilizamos el existente, asegurando que reciba los datos bien) */}
            {isCheckoutOpen && (
                <CheckOutModal
                    booking={{
                        id: booking.id,
                        service_name: serviceName,
                        price: price,
                        client_name: clientName
                    }}
                    onClose={() => setIsCheckoutOpen(false)}
                />
            )}
        </>
    )
}