'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toZonedTime, format } from 'date-fns-tz'
import { Clock, CheckCircle2, Scissors, XCircle, UserCheck } from 'lucide-react'
import CheckOutModal from './CheckOutModal'
import Image from 'next/image'
import { cancelBookingAdmin, markNoShow } from '@/app/admin/bookings/actions'
import { seatBooking } from '@/app/admin/pos/actions'
import { toast } from 'sonner'

const TIMEZONE = 'America/Mexico_City';

import { PosBookingData } from "@/types/supabase-joined";

export default function BookingCard({ booking }: { booking: PosBookingData }) {
    const router = useRouter()
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isMarkingNoShow, setIsMarkingNoShow] = useState(false);
    const [isSeating, setIsSeating] = useState(false);

    // Formatear datos
    const startDate = toZonedTime(booking.start_time, TIMEZONE);
    const timeStr = format(startDate, 'h:mm a', { timeZone: TIMEZONE });

    const clientName = booking.notes?.split('|')[0]?.replace('Cliente:', '').trim() || 'Cliente Anónimo';

    // Manejo seguro de datos opcionales con tipos estrictos
    const staffName = booking.profiles?.full_name?.split(' ')[0] || 'Staff';
    const avatarUrl = booking.profiles?.avatar_url;

    const serviceName = booking.services?.name || 'Servicio';
    const price = booking.services?.price || 0;

    const isCompleted = booking.status === 'completed';
    const isCancelled = booking.status === 'cancelled';
    const isNoShow = booking.status === 'no_show';
    const isSeated = booking.status === 'seated';
    const isPending = booking.status === 'pending' || booking.status === 'confirmed';

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

    const handleNoShow = async () => {
        if (!confirm('¿Marcar como No-Show? Esto afectará la reputación del cliente.')) return

        setIsMarkingNoShow(true)
        const res = await markNoShow(booking.id)
        setIsMarkingNoShow(false)

        if (res?.success) {
            toast.success(res.message)
            router.refresh()
        } else {
            toast.error(res?.error || 'Error')
        }
    }

    const handleSeat = async () => {
        setIsSeating(true)
        const res = await seatBooking(booking.id)
        setIsSeating(false)

        if (res?.success) {
            toast.success('🪑 Cliente en silla')
            router.refresh()
        } else {
            toast.error(res?.error || 'Error al sentar cliente')
        }
    }

    // Determine card styling based on status
    const getCardClasses = () => {
        if (isCompleted) return 'opacity-60'
        if (isCancelled) return 'bg-red-50/50 border-red-100'
        if (isNoShow) return 'bg-orange-50/50 border-orange-100 opacity-60'
        if (isSeated) return 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30'
        return ''
    }

    const getIndicatorColor = () => {
        if (isCompleted) return 'bg-green-500'
        if (isCancelled) return 'bg-red-500'
        if (isNoShow) return 'bg-orange-500'
        if (isSeated) return 'bg-amber-500'
        return 'bg-black'
    }

    return (
        <>
            <div className={`group relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm transition-all hover:shadow-md overflow-hidden ${getCardClasses()}`}>

                {/* Indicador lateral */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getIndicatorColor()}`} />

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
                        ) : isNoShow ? (
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full flex items-center gap-1">
                                <XCircle size={10} /> No Show
                            </span>
                        ) : isSeated ? (
                            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full flex items-center gap-1">
                                <UserCheck size={10} /> En Silla
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
                    {!isCompleted && !isCancelled && !isNoShow && (
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
                                    {/* Only show No-Show and Cancel for non-seated bookings */}
                                    {isPending && (
                                        <>
                                            <button
                                                onClick={handleNoShow}
                                                disabled={isMarkingNoShow}
                                                className="text-xs font-bold text-orange-500 hover:text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {isMarkingNoShow ? '...' : 'No Show'}
                                            </button>
                                            <button
                                                onClick={() => setIsCancelling(true)}
                                                className="text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            {/* ATENDER: Start service, change to seated */}
                                            <button
                                                onClick={handleSeat}
                                                disabled={isSeating}
                                                className="text-xs font-bold text-white bg-black hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                            >
                                                {isSeating ? '...' : 'Atender'}
                                            </button>
                                        </>
                                    )}

                                    {/* COBRAR: Only visible when seated */}
                                    {isSeated && (
                                        <button
                                            onClick={() => setIsCheckoutOpen(true)}
                                            className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-lg transition-colors shadow-sm"
                                        >
                                            💰 Cobrar
                                        </button>
                                    )}
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