'use client';

import { PosBookingData } from '@/types/supabase-joined';
import { useState, useMemo, useEffect, useRef } from 'react';
import { isSameDay, isAfter, isBefore, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, MessageCircle, Pencil, XCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cancelBookingAdmin, quickCheckout } from '@/app/admin/bookings/actions';
import { seatBooking } from '@/app/admin/pos/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Componentes Reutilizados
import NewBookingModal from '../NewBookingModal';
import EditBookingModal from '../bookings/EditBookingModal';
import WhatsAppNotifyModal from '../bookings/WhatsAppNotifyModal';
import CheckOutModal from '../CheckOutModal';
import { cn } from '@/lib/utils';

interface Props {
    bookings: PosBookingData[];
    staff: any[];
    services: any[];
    tenantId: string;
}

// Resolve client info from a booking
function getClientInfo(booking: PosBookingData) {
    let clientName = "Cliente";
    let clientPhone: string | null = null;

    if (booking.guest_name) {
        clientName = booking.guest_name;
    } else if (booking.customer?.full_name) {
        clientName = booking.customer.full_name;
    } else if (booking.notes) {
        clientName = booking.notes
            .replace('Walk-in: ', '')
            .replace('WALK-IN | Cliente: ', '')
            .split('|')[0]
            .replace('Cliente:', '')
            .trim();
    }

    if (booking.guest_phone) {
        clientPhone = booking.guest_phone;
    } else if (booking.notes?.includes('Tel:')) {
        const telMatch = booking.notes.match(/Tel:\s*([^\s|]+)/);
        if (telMatch) clientPhone = telMatch[1];
    } else if (booking.customer?.phone) {
        clientPhone = booking.customer.phone;
    }

    return { clientName, clientPhone };
}

export default function PocketAgenda({ bookings, staff, services, tenantId }: Props) {
    const router = useRouter();
    const now = new Date();
    const [selectedDate, setSelectedDate] = useState(startOfDay(now));
    const [showCancelled, setShowCancelled] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Modal States
    const [selectedBooking, setSelectedBooking] = useState<PosBookingData | null>(null);
    const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
    const [editBooking, setEditBooking] = useState<PosBookingData | null>(null);
    const [isSeating, setIsSeating] = useState(false);
    const [isQuickCheckingOut, setIsQuickCheckingOut] = useState(false);
    const [waModal, setWaModal] = useState<{
        isOpen: boolean;
        variant: 'reschedule' | 'cancel';
        clientName: string;
        clientPhone: string | null;
        dateFormatted?: string;
        timeFormatted?: string;
    }>({ isOpen: false, variant: 'cancel', clientName: '', clientPhone: null });

    const isToday = isSameDay(selectedDate, now);

    // Generar días de la semana actual para el Week Strip
    const weekDays = useMemo(() => {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [selectedDate]);

    const { current, next } = useMemo(() => {
        if (!isToday) return { current: null, next: null };

        let currentBooking: PosBookingData | null = null;
        let nextBooking: PosBookingData | null = null;

        const dateBookings = bookings
            .filter(b => isSameDay(toZonedTime(b.start_time, DEFAULT_TIMEZONE), selectedDate))
            .filter(b => ['pending', 'confirmed', 'seated'].includes(b.status))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        for (const b of dateBookings) {
            const start = toZonedTime(b.start_time, DEFAULT_TIMEZONE);
            const end = toZonedTime(b.end_time, DEFAULT_TIMEZONE);

            if (isBefore(start, now) && isAfter(end, now)) {
                if (!currentBooking) currentBooking = b;
            } else if (isAfter(start, now)) {
                if (!nextBooking) nextBooking = b;
            }
        }

        return { current: currentBooking, next: nextBooking };
    }, [bookings, selectedDate, now]);

    const dailyBookings = useMemo(() => {
        return bookings
            .filter(b => isSameDay(toZonedTime(b.start_time, DEFAULT_TIMEZONE), selectedDate))
            .filter(b => b.id !== current?.id && b.id !== next?.id)
            .filter(b => showCancelled ? true : b.status !== 'cancelled')
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }, [bookings, selectedDate, current, next, showCancelled]);

    const formatTime = (iso: string) => {
        return toZonedTime(iso, DEFAULT_TIMEZONE).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    const handleCancel = async (booking: PosBookingData) => {
        const { clientName, clientPhone } = getClientInfo(booking);
        if (!confirm(`¿Cancelar la cita de ${clientName}?`)) return;

        const result = await cancelBookingAdmin(booking.id, 'Cancelado desde Pocket Agenda');
        if (result?.error) { toast.error(result.error); return; }

        toast.success('Cita cancelada');
        setSelectedBooking(null);
        router.refresh();

        const startDate = toZonedTime(booking.start_time, DEFAULT_TIMEZONE);
        setWaModal({
            isOpen: true, variant: 'cancel', clientName, clientPhone,
            dateFormatted: format(startDate, "EEEE d 'de' MMMM", { locale: es }),
            timeFormatted: format(startDate, 'h:mm a'),
        });
    };

    const handleEditSuccess = (booking: PosBookingData, dateFormatted: string, timeFormatted: string) => {
        const { clientName, clientPhone } = getClientInfo(booking);
        setSelectedBooking(null);
        router.refresh();
        setWaModal({ isOpen: true, variant: 'reschedule', clientName, clientPhone, dateFormatted, timeFormatted });
    };

    const statusLabels: Record<string, string> = {
        completed: 'Pagado', confirmed: 'Confirmado', seated: 'En Silla',
        no_show: 'No Show', cancelled: 'Cancelado', pending: 'Pendiente',
    };

    return (
        <div className="p-0 h-full flex flex-col bg-gray-50 overflow-hidden relative">
            {/* FAB - Nueva Cita */}
            <button
                onClick={() => setIsNewBookingOpen(true)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-all hover:bg-zinc-800"
            >
                <Plus size={24} strokeWidth={3} />
            </button>

            {/* HEADER DE NAVEGACIÓN */}
            <div className="bg-white px-6 pt-8 pb-4 shadow-sm border-b border-gray-100 z-10">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-black text-gray-900 italic tracking-tight">Pocket Agenda</h2>
                    <button
                        onClick={() => setSelectedDate(startOfDay(now))}
                        className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-all ${isToday ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white shadow-md shadow-blue-200'}`}
                    >
                        Hoy
                    </button>
                </div>
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 active:scale-95 transition-all">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1 text-center">
                        <p className="text-sm font-bold text-gray-900 capitalize">
                            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                        </p>
                    </div>
                    <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 active:scale-95 transition-all">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* WEEK STRIP */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1" ref={scrollRef}>
                    {weekDays.map((day, idx) => {
                        const isSel = isSameDay(day, selectedDate);
                        const isDayToday = isSameDay(day, now);
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(startOfDay(day))}
                                className={`flex flex-col items-center min-w-[48px] py-3 rounded-2xl transition-all active:scale-90 ${isSel
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-blue-100'
                                    : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
                                    }`}
                            >
                                <span className={`text-[10px] font-bold uppercase tracking-tighter mb-1 ${isSel ? 'text-blue-100' : 'text-gray-400'}`}>
                                    {format(day, 'EEE', { locale: es }).substring(0, 3)}
                                </span>
                                <span className={`text-sm font-black ${isDayToday && !isSel ? 'text-blue-600' : ''}`}>
                                    {format(day, 'd')}
                                </span>
                                {isDayToday && isSel && <div className="w-1 h-1 rounded-full bg-white mt-1"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-32">
                {/* Cita Actual y Siguiente (Solo si es HOY) */}
                {isToday && (
                    <>
                        <div
                            onClick={() => current && setSelectedBooking(current)}
                            className="bg-black p-6 rounded-3xl text-white shadow-xl relative overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[0.98] active:scale-[0.95]"
                        >
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Cita Actual
                            </p>
                            {current ? (
                                <>
                                    <h3 className="text-3xl font-black mb-1">{getClientInfo(current).clientName}</h3>
                                    <p className="text-gray-300 font-medium mb-4">{current.services?.name}</p>
                                    <div className="flex justify-between items-end border-t border-white/10 pt-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Horario</p>
                                            <p className="font-bold text-lg">{formatTime(current.start_time)} - {formatTime(current.end_time)}</p>
                                        </div>
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">En Silla</span>
                                    </div>
                                </>
                            ) : (
                                <div className="py-2">
                                    <h3 className="text-xl font-bold text-gray-400 mb-1">Sin cita actual</h3>
                                    <p className="text-gray-500 text-sm">Libre en este momento.</p>
                                </div>
                            )}
                        </div>

                        <div
                            onClick={() => next && setSelectedBooking(next)}
                            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[0.98] active:scale-[0.95] hover:shadow-md"
                        >
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Siguiente Cita
                            </p>
                            {next ? (
                                <>
                                    <h3 className="text-2xl font-black text-gray-900 mb-1">{getClientInfo(next).clientName}</h3>
                                    <p className="text-gray-500 font-medium mb-4">{next.services?.name}</p>
                                    <div className="flex justify-between items-end border-t border-gray-50 pt-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Inicia a las</p>
                                            <p className="font-bold text-gray-900 text-lg">{formatTime(next.start_time)}</p>
                                        </div>
                                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{next.profiles?.full_name?.split(' ')[0]}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="py-2">
                                    <h3 className="text-lg font-bold text-gray-400 mb-1">No hay más citas</h3>
                                    <p className="text-gray-400 text-sm">Has terminado por hoy.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Lista de citas del día seleccionado */}
                <div className="pt-2">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span>{isToday ? 'Resto del Día' : 'Agenda del Día'}</span>
                            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{dailyBookings.length} {dailyBookings.length === 1 ? 'cita' : 'citas'}</span>
                        </div>

                        <button
                            onClick={() => setShowCancelled(!showCancelled)}
                            className={`px-3 py-1 rounded-full border transition-all active:scale-95 ${showCancelled
                                ? 'bg-red-50 border-red-200 text-red-600 font-bold'
                                : 'bg-white border-gray-200 text-gray-400 font-medium'
                                }`}
                        >
                            {showCancelled ? 'Ocultar' : 'Ver Canceladas'}
                        </button>
                    </h3>
                    <div className="space-y-3">
                        {dailyBookings.length > 0 ? (
                            dailyBookings.map(b => {
                                const isCancelled = b.status === 'cancelled';
                                return (
                                    <div
                                        key={b.id}
                                        onClick={() => setSelectedBooking(b)}
                                        className={`bg-white p-4 rounded-3xl border shadow-sm flex items-center justify-between transition-all duration-200 cursor-pointer hover:scale-[0.98] active:scale-[0.95] hover:shadow-md group ${isCancelled
                                            ? 'border-red-100 opacity-60 border-l-4 border-l-red-500'
                                            : 'border-gray-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-1 h-8 rounded-full transition-colors ${isCancelled ? 'bg-red-200' : 'bg-gray-100 group-hover:bg-blue-200'}`}></div>
                                            <div>
                                                <p className={`font-black ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{getClientInfo(b).clientName}</p>
                                                <p className="text-xs text-gray-500 font-medium">{b.services?.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black text-lg ${isCancelled ? 'text-gray-400' : 'text-gray-900'}`}>{formatTime(b.start_time)}</p>
                                            <div className="flex flex-col items-end">
                                                {isCancelled && <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter mb-0.5">CANCELADA</span>}
                                                <p className={`text-[10px] font-bold uppercase ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-400'}`}>
                                                    {b.profiles?.full_name?.split(' ')[0]}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="bg-gray-100/50 border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center">
                                <CalendarIcon className="mx-auto text-gray-300 mb-4" size={32} />
                                <p className="text-gray-400 font-bold">Sin citas programadas</p>
                                <p className="text-xs text-gray-300 mt-1 italic">Este día parece estar tranquilo.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* DETAIL MODAL (POCKET VERSION) */}
            <AnimatePresence>
                {selectedBooking && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm p-0" onClick={() => setSelectedBooking(null)}>
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white rounded-t-[40px] p-8 w-full shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner italic font-black text-gray-300">
                                    {getClientInfo(selectedBooking).clientName.substring(0, 1)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-2xl text-gray-900 tracking-tight">{getClientInfo(selectedBooking).clientName}</h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-gray-500 font-medium">{selectedBooking.services?.name}</p>
                                        <span className="text-blue-600 font-black tracking-tighter">${selectedBooking.services?.price}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 italic">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Horario</p>
                                    <p className="font-bold text-gray-900">{formatTime(selectedBooking.start_time)}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 italic">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Estatus</p>
                                    <p className={cn(
                                        "font-bold",
                                        selectedBooking.status === 'completed' ? 'text-emerald-600' :
                                            selectedBooking.status === 'cancelled' ? 'text-red-500' :
                                                selectedBooking.status === 'seated' ? 'text-purple-600' : 'text-blue-600'
                                    )}>
                                        {statusLabels[selectedBooking.status] || selectedBooking.status}
                                    </p>
                                </div>
                            </div>

                            {selectedBooking.notes && (
                                <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100 mb-8 italic">
                                    <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">Notas / Diagnóstico</p>
                                    <p className="text-sm text-gray-700 font-medium leading-relaxed">{selectedBooking.notes}</p>
                                </div>
                            )}

                            {/* Actions Column */}
                            <div className="space-y-3">
                                {selectedBooking.status === 'seated' && (
                                    <CheckOutModal
                                        booking={{
                                            id: selectedBooking.id,
                                            service_name: selectedBooking.services?.name || "Servicio",
                                            price: selectedBooking.services?.price || 0,
                                            client_name: getClientInfo(selectedBooking).clientName
                                        }}
                                        onClose={() => setSelectedBooking(null)}
                                        inline={true}
                                    />
                                )}

                                {['pending', 'confirmed', 'seated'].includes(selectedBooking.status) && (
                                    <>
                                        {['pending', 'confirmed'].includes(selectedBooking.status) && (
                                            <button
                                                onClick={async () => {
                                                    setIsSeating(true);
                                                    const res = await seatBooking(selectedBooking.id);
                                                    setIsSeating(false);
                                                    if (res.success) {
                                                        toast.success('🪑 Cliente atendido');
                                                        setSelectedBooking(null);
                                                        router.refresh();
                                                    } else {
                                                        toast.error(res.error || 'Error');
                                                    }
                                                }}
                                                disabled={isSeating}
                                                className="w-full py-4 bg-black text-white rounded-3xl font-black shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
                                            >
                                                {isSeating ? 'Procesando...' : 'Atender Cliente'}
                                            </button>
                                        )}

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => {
                                                    setEditBooking(selectedBooking);
                                                    setSelectedBooking(null);
                                                }}
                                                className="flex items-center justify-center gap-2 py-4 bg-gray-100 text-gray-600 rounded-3xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
                                            >
                                                <Pencil size={18} />
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleCancel(selectedBooking)}
                                                className="flex items-center justify-center gap-2 py-4 bg-red-50 text-red-500 rounded-3xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all border border-red-100"
                                            >
                                                <XCircle size={18} />
                                                Cancelar
                                            </button>
                                        </div>

                                        {getClientInfo(selectedBooking).clientPhone && (
                                            <a
                                                href={`https://wa.me/${cleanPhoneForWa(getClientInfo(selectedBooking).clientPhone!)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 py-4 bg-[#25D366] text-white rounded-3xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-green-100"
                                            >
                                                <MessageCircle size={18} />
                                                WhatsApp Directo
                                            </a>
                                        )}
                                    </>
                                )}
                            </div>

                            <button onClick={() => setSelectedBooking(null)} className="w-full mt-6 py-2 text-gray-300 font-bold uppercase text-[10px] tracking-[0.2em]">
                                Cerrar Detalles
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODALS REUTILIZADOS */}
            {isNewBookingOpen && (
                <NewBookingModal
                    tenantId={tenantId}
                    services={services}
                    staff={staff}
                    onClose={() => setIsNewBookingOpen(false)}
                />
            )}

            {editBooking && (
                <EditBookingModal
                    isOpen={!!editBooking}
                    onClose={() => setEditBooking(null)}
                    bookingId={editBooking.id}
                    currentDate={editBooking.start_time}
                    currentStaffId={editBooking.staff_id}
                    currentStaffName={editBooking.profiles?.full_name || 'Staff'}
                    serviceName={editBooking.services?.name || 'Servicio'}
                    clientName={getClientInfo(editBooking).clientName}
                    clientPhone={getClientInfo(editBooking).clientPhone}
                    staff={staff}
                    onSuccess={(df, tf) => handleEditSuccess(editBooking, df, tf)}
                />
            )}

            <WhatsAppNotifyModal
                isOpen={waModal.isOpen}
                onClose={() => setWaModal(prev => ({ ...prev, isOpen: false }))}
                clientName={waModal.clientName}
                clientPhone={waModal.clientPhone}
                variant={waModal.variant}
                dateFormatted={waModal.dateFormatted}
                timeFormatted={waModal.timeFormatted}
            />
        </div>
    );
}

function cleanPhoneForWa(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    if (!cleaned.startsWith('52') && cleaned.length === 10) {
        cleaned = '52' + cleaned;
    }
    return cleaned;
}
