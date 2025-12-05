'use client'

import { useState } from 'react'
import { toZonedTime, format } from 'date-fns-tz'
import { Clock, CheckCircle2, Scissors, XCircle } from 'lucide-react'
import CheckOutModal from './CheckOutModal'
import Image from 'next/image'
import { cancelBookingAdmin } from '@/app/admin/bookings/actions'
import { toast } from 'sonner'

const TIMEZONE = 'America/Mexico_City';

type BookingProps = {
    id: string;
    start_time: string;
    status: string;
    notes: string | null;
    services: { name: string; price: number; duration_min: number } | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profiles?: any; // Supabase join a veces trae esto
}

export default function BookingCard({ booking }: { booking: BookingProps }) {
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    // Formatear datos
    const startDate = toZonedTime(booking.start_time, TIMEZONE);
    const timeStr = format(startDate, 'h:mm a', { timeZone: TIMEZONE });

    const clientName = booking.notes?.split('|')[0]?.replace('Cliente:', '').trim() || 'Cliente Anónimo';

    // Manejo seguro de datos opcionales
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const staffName = (booking as any).profiles?.full_name?.split(' ')[0] || 'Staff';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const avatarUrl = (booking as any).profiles?.avatar_url;

    const serviceName = booking.services?.name || 'Servicio';
    const price = booking.services?.price || 0;

    const isCompleted = booking.status === 'completed';
    const isCancelled = booking.status === 'cancelled';

    const handleCancel = async () => {
        if (!confirm('¿Confirmas la cancelación?')) return;

        const res = await cancelBookingAdmin(booking.id, cancelReason);
        if (res?.success) {
            toast.success('Cita cancelada');
            setIsCancelling(false);
        } else {
            toast.error(res?.error || 'Error');
        }
    }

    return (
        <>
            <div className={`group relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm transition-all hover:shadow-md overflow-hidden ${isCompleted ? 'opacity-60' : ''} ${isCancelled ? 'bg-red-50/50 border-red-100' : ''}`}>

                {/* Indicador lateral */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isCompleted ? 'bg-green-500' : isCancelled ? 'bg-red-500' : 'bg-black'
                    }`} />

                <div className="flex justify-between items-start mb-3 pl-3">
                    <div>
                        <h4 className={`font-bold text-lg leading-tight ${isCancelled ? 'text-red-800 line-through' : 'text-gray-900'}`}>
                            {clientName}
                        </h4>
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

                    <div className="text-right">
                        {isCompleted ? (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle2 size={10} /> Pagado
                            </span>
                        ) : isCancelled ? (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1">
                                <XCircle size={10} /> Cancelado
                            </span>
                        ) : (
                            <span className="font-black text-lg text-gray-900">${price}</span>
                        )}
                    </div>
                </div>

                {/* Footer Tarjeta */}
                <div className="flex items-center justify-between border-t border-gray-50 pt-3 pl-3 mt-3">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden relative">
                            {avatarUrl ? (
                                <Image src={avatarUrl} alt={staffName} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                                    {staffName.charAt(0)}
                                </div>
                            )}
                        </div>
                        <span className="text-xs text-gray-400 font-medium">{staffName}</span>
                    </div>

                    {/* ACCIONES ADMIN */}
                    {!isCompleted && !isCancelled && (
                        <div className="flex gap-2">
                            {isCancelling ? (
                                <div className="flex items-center gap-2 animate-in slide-in-from-right-4 fade-in">
                                    <input
                                        type="text"
                                        placeholder="Motivo..."
                                        className="text-xs border rounded px-2 py-1 w-24 focus:ring-black outline-none"
                                        autoFocus
                                        onChange={(e) => setCancelReason(e.target.value)}
                                    />
                                    <button onClick={handleCancel} className="text-xs bg-red-600 text-white px-2 py-1 rounded font-bold hover:bg-red-700">OK</button>
                                    <button onClick={() => setIsCancelling(false)} className="text-xs text-gray-500 px-1 hover:text-black">X</button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsCancelling(true)}
                                        className="text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => setIsCheckoutOpen(true)}
                                        className="text-xs font-bold text-white bg-black hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                    >
                                        Cobrar
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

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