'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { PosBookingData } from '@/types/supabase-joined';
import { format, addDays, subDays, isSameDay, setHours, setMinutes, isBefore, isAfter, differenceInMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, User, Pencil, XCircle, Eye } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import NewBookingModal from '../NewBookingModal';
import { cn } from '@/lib/utils';
import CheckOutModal from '../CheckOutModal';
import { seatBooking } from '@/app/admin/pos/actions';
import { cancelBookingAdmin } from '@/app/admin/bookings/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import EditBookingModal from '../bookings/EditBookingModal';
import WhatsAppNotifyModal from '../bookings/WhatsAppNotifyModal';
import type { StaffSchedule } from '../BookingsViewSwitcher';

const TIMEZONE = DEFAULT_TIMEZONE;
const CELL_HEIGHT = 120;
const MIN_COLUMN_WIDTH = 220;
const TIME_COLUMN_WIDTH = 64;

// Color palette per barber — cycled by index
const STAFF_COLORS = [
    { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-l-blue-500', dot: 'bg-blue-500', ring: 'ring-blue-200' },
    { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-l-emerald-500', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
    { bg: 'bg-violet-500', text: 'text-violet-700', light: 'bg-violet-50', border: 'border-l-violet-500', dot: 'bg-violet-500', ring: 'ring-violet-200' },
    { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', border: 'border-l-amber-500', dot: 'bg-amber-500', ring: 'ring-amber-200' },
    { bg: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-50', border: 'border-l-rose-500', dot: 'bg-rose-500', ring: 'ring-rose-200' },
    { bg: 'bg-cyan-500', text: 'text-cyan-700', light: 'bg-cyan-50', border: 'border-l-cyan-500', dot: 'bg-cyan-500', ring: 'ring-cyan-200' },
];

type StaffMember = {
    id: string;
    full_name: string;
    avatar_url?: string | null;
};

type Service = {
    id: string;
    name: string;
    duration_min: number;
};

interface BookingsCalendarProps {
    bookings: PosBookingData[];
    staff: StaffMember[];
    services: Service[];
    tenantId: string;
    currentUserRole: string;
    startHour?: number;
    endHour?: number;
    staffSchedules?: StaffSchedule[];
    soloStaffId?: string | null;
    onSoloStaffChange?: (id: string | null) => void;
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

export default function BookingsCalendar({
    bookings,
    staff,
    services,
    tenantId,
    currentUserRole,
    startHour = 9,
    endHour = 21,
    staffSchedules = [],
    soloStaffId = null,
    onSoloStaffChange,
}: BookingsCalendarProps) {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<PosBookingData | null>(null);
    const [isSeating, setIsSeating] = useState(false);

    // Peek & Pop
    const [hoveredBooking, setHoveredBooking] = useState<PosBookingData | null>(null);
    const [peekPosition, setPeekPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const peekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Edit/Cancel modals
    const [editBooking, setEditBooking] = useState<PosBookingData | null>(null);
    const [waModal, setWaModal] = useState<{
        isOpen: boolean;
        variant: 'reschedule' | 'cancel';
        clientName: string;
        clientPhone: string | null;
        dateFormatted?: string;
        timeFormatted?: string;
    }>({ isOpen: false, variant: 'cancel', clientName: '', clientPhone: null });

    // Filter bookings for current date
    const dailyBookings = bookings.filter(b => {
        const bookingDate = toZonedTime(b.start_time, TIMEZONE);
        return isSameDay(bookingDate, currentDate);
    });

    // Determine "next client" — the closest upcoming pending/confirmed booking
    const nextBookingId = useMemo(() => {
        const now = new Date();
        if (!isSameDay(currentDate, now)) return null;

        const upcoming = dailyBookings
            .filter(b => ['pending', 'confirmed'].includes(b.status))
            .filter(b => isAfter(new Date(b.start_time), now))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        return upcoming[0]?.id || null;
    }, [dailyBookings, currentDate]);

    // Dynamic hours — collapse empty early/late hours
    const dynamicHours = useMemo(() => {
        if (dailyBookings.length === 0) return { start: startHour, end: endHour };

        let earliest = 24;
        let latest = 0;
        for (const b of dailyBookings) {
            const s = toZonedTime(b.start_time, TIMEZONE);
            const e = toZonedTime(b.end_time, TIMEZONE);
            if (s.getHours() < earliest) earliest = s.getHours();
            if (e.getHours() > latest) latest = e.getHours();
            if (e.getMinutes() > 0) latest = e.getHours() + 1; // round up
        }

        return {
            start: Math.max(startHour, Math.min(earliest - 1, startHour)),
            end: Math.min(endHour, Math.max(latest + 1, endHour)),
        };
    }, [dailyBookings, startHour, endHour]);

    const effectiveStart = dynamicHours.start;
    const effectiveEnd = dynamicHours.end;
    const timeSlots = Array.from({ length: effectiveEnd - effectiveStart + 1 }, (_, i) => effectiveStart + i);

    // Filtered staff
    const displayStaff = soloStaffId ? staff.filter(s => s.id === soloStaffId) : staff;

    const getBookingStyle = (startTimeStr: string, durationMin: number) => {
        const startDate = toZonedTime(startTimeStr, TIMEZONE);
        const startHourVal = startDate.getHours();
        const startMin = startDate.getMinutes();

        const top = ((startHourVal - effectiveStart) * CELL_HEIGHT) + ((startMin / 60) * CELL_HEIGHT);
        const height = (durationMin / 60) * CELL_HEIGHT;

        return { top: `${top}px`, height: `${height}px` };
    };

    // Peek handlers
    const handlePointerEnter = (booking: PosBookingData, e: React.PointerEvent) => {
        if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
        peekTimeoutRef.current = setTimeout(() => {
            setPeekPosition({ x: e.clientX, y: e.clientY });
            setHoveredBooking(booking);
        }, 400); // 400ms delay
    };

    const handlePointerLeave = () => {
        if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
        setHoveredBooking(null);
    };

    // Cancel handler
    const handleCancel = async (booking: PosBookingData) => {
        const { clientName, clientPhone } = getClientInfo(booking);
        if (!confirm(`¿Cancelar la cita de ${clientName}?`)) return;

        const result = await cancelBookingAdmin(booking.id, 'Cancelado desde calendario');
        if (result?.error) { toast.error(result.error); return; }

        toast.success('Cita cancelada');
        setSelectedBooking(null);
        router.refresh();

        const startDate = toZonedTime(booking.start_time, TIMEZONE);
        setWaModal({
            isOpen: true, variant: 'cancel', clientName, clientPhone,
            dateFormatted: format(startDate, "EEEE d 'de' MMMM"),
            timeFormatted: format(startDate, 'h:mm a'),
        });
    };

    const handleEditSuccess = (booking: PosBookingData, dateFormatted: string, timeFormatted: string) => {
        const { clientName, clientPhone } = getClientInfo(booking);
        setSelectedBooking(null);
        router.refresh();
        setWaModal({ isOpen: true, variant: 'reschedule', clientName, clientPhone, dateFormatted, timeFormatted });
    };

    // Cleanup
    useEffect(() => {
        return () => { if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current); };
    }, []);

    // Column width expands in solo mode
    const colWidth = soloStaffId ? '100%' : `${MIN_COLUMN_WIDTH}px`;

    const statusStyles = {
        completed: 'bg-emerald-50/80 border-l-emerald-500 text-emerald-900',
        confirmed: 'bg-blue-50/80 border-l-blue-500 text-blue-900',
        seated: 'bg-purple-50/80 border-l-purple-500 text-purple-900 ring-2 ring-purple-300/30',
        no_show: 'bg-red-50/60 border-l-red-400 text-red-800 opacity-60',
        cancelled: 'bg-red-50/60 border-l-red-400 text-red-800 opacity-50',
        pending: 'bg-amber-50/80 border-l-amber-500 text-amber-900',
    };

    const statusLabels: Record<string, string> = {
        completed: 'Pagado', confirmed: 'Confirmado', seated: 'En Silla',
        no_show: 'No Show', cancelled: 'Cancelado', pending: 'Pendiente',
    };

    return (
        <div className="flex flex-col h-[calc(100dvh-100px)] bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 md:p-5 border-b border-gray-100 bg-white z-20">
                <div className="flex items-center gap-3 justify-between md:justify-start">
                    <h2 className="hidden md:flex text-xl font-black text-gray-900 tracking-tight items-center gap-2">
                        <CalendarIcon className="text-gray-900" strokeWidth={2.5} size={20} />
                        Agenda
                    </h2>
                </div>

                {/* Date Nav */}
                <div className="flex items-center justify-center bg-gray-50 rounded-2xl p-1 border border-gray-200 w-full md:w-auto">
                    <button
                        onClick={() => setCurrentDate(prev => subDays(prev, 1))}
                        className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500 hover:text-black active:scale-95"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="flex-1 md:flex-none px-3 font-bold text-sm text-gray-700 md:w-40 text-center capitalize">
                        {format(currentDate, 'EEE d MMM')}
                    </div>
                    <button
                        onClick={() => setCurrentDate(prev => addDays(prev, 1))}
                        className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500 hover:text-black active:scale-95"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <button
                    onClick={() => setIsNewBookingOpen(true)}
                    className="bg-black text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg w-full md:w-auto"
                >
                    <Plus size={16} strokeWidth={3} />
                    Nueva Cita
                </button>
            </div>

            {/* CALENDAR BODY */}
            <div className="flex-1 overflow-y-auto overflow-x-auto relative scroll-smooth bg-gray-50/30">
                <div className="flex" style={{ minWidth: soloStaffId ? 'auto' : `${TIME_COLUMN_WIDTH + (staff.length * MIN_COLUMN_WIDTH)}px` }}>

                    {/* TIME COLUMN */}
                    <div className="flex-shrink-0 bg-white border-r border-gray-200 z-50 sticky left-0" style={{ width: `${TIME_COLUMN_WIDTH}px` }}>
                        <div className="h-12 border-b border-gray-100 bg-gray-50/50 flex items-center justify-center">
                            <Clock size={12} className="text-gray-300" />
                        </div>
                        {timeSlots.map(hour => (
                            <div key={hour} className="relative border-b border-gray-100/60 bg-white text-right pr-2 text-[10px] font-medium text-gray-400" style={{ height: `${CELL_HEIGHT}px` }}>
                                <span className="relative -top-2 bg-white px-0.5">
                                    {format(setMinutes(setHours(new Date(), hour), 0), 'h a')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* STAFF COLUMNS */}
                    <div className="flex-1 flex relative">
                        {/* Grid Lines — subtle */}
                        <div className="absolute inset-0 z-0 pointer-events-none">
                            <div className="h-12"></div>
                            {timeSlots.map(hour => (
                                <div key={hour} className="border-b border-gray-100/50 w-full" style={{ height: `${CELL_HEIGHT}px` }}></div>
                            ))}
                        </div>

                        {displayStaff.map(member => (
                            <div
                                key={member.id}
                                className={cn("flex-shrink-0 border-r border-gray-100/50 relative", soloStaffId ? "flex-1" : "")}
                                style={soloStaffId ? {} : { width: `${MIN_COLUMN_WIDTH}px`, minWidth: `${MIN_COLUMN_WIDTH}px` }}
                            >
                                {/* Staff Header */}
                                <div className="h-12 border-b border-gray-100 bg-white sticky top-0 z-30 flex items-center gap-2 px-3 shadow-sm">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden relative border border-gray-100 flex-shrink-0">
                                        {member.avatar_url ? (
                                            <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <User size={12} />
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-bold text-gray-700 text-xs truncate">{member.full_name}</span>
                                    <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", STAFF_COLORS[staff.indexOf(member) % STAFF_COLORS.length].dot)} />
                                </div>

                                {/* Bookings Column */}
                                <div className="relative z-0" style={{ height: `${(effectiveEnd - effectiveStart + 1) * CELL_HEIGHT}px` }}>
                                    {dailyBookings
                                        .filter(b => b.staff_id === member.id)
                                        .map(booking => {
                                            const duration = booking.services?.duration_min || 30;
                                            const { top, height } = getBookingStyle(booking.start_time, duration);
                                            const { clientName } = getClientInfo(booking);
                                            const serviceName = booking.services?.name || "Servicio";
                                            const price = booking.services?.price || 0;
                                            const isNext = booking.id === nextBookingId;
                                            const isCancelled = booking.status === 'cancelled';
                                            const statusColor = statusStyles[booking.status as keyof typeof statusStyles] || 'bg-gray-50/80 border-l-gray-400 text-gray-700';
                                            const staffColorIndex = staff.findIndex(s => s.id === member.id);
                                            const staffColor = STAFF_COLORS[staffColorIndex >= 0 ? staffColorIndex % STAFF_COLORS.length : 0];

                                            return (
                                                <motion.div
                                                    key={booking.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    onClick={() => setSelectedBooking(booking)}
                                                    onPointerEnter={(e) => handlePointerEnter(booking, e)}
                                                    onPointerLeave={handlePointerLeave}
                                                    className={cn(
                                                        "absolute left-2 right-2 rounded-xl border shadow-sm cursor-pointer transition-all duration-150",
                                                        "hover:shadow-lg hover:scale-[1.02] hover:z-20",
                                                        `border-l-4 ${staffColor.border}`,
                                                        statusColor.replace(/border-l-\S+/g, ''),
                                                        isNext && `ring-2 ${staffColor.ring} ring-offset-1 shadow-md`,
                                                        isCancelled && "line-through decoration-red-300 opacity-50"
                                                    )}
                                                    style={{ top, height, minHeight: '36px' }}
                                                >
                                                    <div className="flex flex-col h-full justify-between overflow-hidden p-2">
                                                        <div>
                                                            <div className="flex justify-between items-start gap-1">
                                                                <span className={cn(
                                                                    "font-black text-xs truncate leading-tight",
                                                                    soloStaffId && "text-sm"
                                                                )}>
                                                                    {isNext && <span className="mr-1">▸</span>}
                                                                    {clientName}
                                                                </span>
                                                                <span className="text-[10px] opacity-60 font-mono font-medium whitespace-nowrap">
                                                                    {format(toZonedTime(booking.start_time, TIMEZONE), 'h:mm')}
                                                                </span>
                                                            </div>
                                                            <div className={cn(
                                                                "text-[10px] opacity-70 truncate mt-0.5",
                                                                soloStaffId && "text-xs"
                                                            )}>
                                                                {serviceName}
                                                            </div>
                                                        </div>

                                                        {(parseInt(height) > 50) && (
                                                            <div className="flex justify-between items-end">
                                                                <span className="text-[10px] font-bold opacity-50">${price}</span>
                                                                {booking.status === 'seated' && (
                                                                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                                                                )}
                                                                {isNext && (
                                                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                                                        SIGUIENTE
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}

                                    {/* Current Time Line */}
                                    {isSameDay(currentDate, new Date()) && (
                                        <div
                                            className="absolute w-full border-t-2 border-red-500 z-10 pointer-events-none"
                                            style={{
                                                top: `${((new Date().getHours() - effectiveStart) * CELL_HEIGHT) + ((new Date().getMinutes() / 60) * CELL_HEIGHT)}px`
                                            }}
                                        >
                                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full -mt-[6px] -ml-[5px]"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* PEEK & POP BUBBLE */}
            <AnimatePresence>
                {hoveredBooking && !selectedBooking && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-[100] bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-64 pointer-events-none"
                        style={{
                            left: Math.min(peekPosition.x + 12, window.innerWidth - 280),
                            top: Math.min(peekPosition.y - 20, window.innerHeight - 200),
                        }}
                    >
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-sm">👤</div>
                            <div>
                                <p className="font-black text-sm text-gray-900">{getClientInfo(hoveredBooking).clientName}</p>
                                <p className="text-[10px] text-gray-500">{hoveredBooking.services?.name}</p>
                            </div>
                        </div>
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Hora</span>
                                <span className="font-bold">{format(toZonedTime(hoveredBooking.start_time, TIMEZONE), 'h:mm a')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Barbero</span>
                                <span className="font-bold">{hoveredBooking.profiles?.full_name || 'Staff'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Precio</span>
                                <span className="font-bold">${hoveredBooking.services?.price || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Estado</span>
                                <span className={cn(
                                    "text-xs font-bold px-2 py-0.5 rounded-full",
                                    hoveredBooking.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                        hoveredBooking.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                                            hoveredBooking.status === 'seated' ? 'bg-purple-50 text-purple-700' :
                                                'bg-blue-50 text-blue-700'
                                )}>
                                    {statusLabels[hoveredBooking.status] || hoveredBooking.status}
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                            Clic para ver opciones
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* DETAIL MODAL */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedBooking(null)}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={() => setSelectedBooking(null)} className="absolute top-4 right-4 text-gray-400 hover:text-black text-lg">✕</button>

                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">👤</div>
                            <div>
                                <h3 className="font-black text-lg">{getClientInfo(selectedBooking).clientName}</h3>
                                <p className="text-gray-500 text-sm">{selectedBooking.services?.name || "Servicio"}</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Hora</span>
                                <span className="font-bold">{format(toZonedTime(selectedBooking.start_time, TIMEZONE), 'h:mm a')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Staff</span>
                                <span className="font-bold">{selectedBooking.profiles?.full_name || "Equipo"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Precio</span>
                                <span className="font-bold">${selectedBooking.services?.price || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500">Estatus</span>
                                <span className={cn(
                                    "font-bold capitalize px-2 py-0.5 rounded-full text-xs",
                                    selectedBooking.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                        selectedBooking.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                                            selectedBooking.status === 'seated' ? 'bg-purple-50 text-purple-700' :
                                                'bg-blue-50 text-blue-700'
                                )}>
                                    {statusLabels[selectedBooking.status] || selectedBooking.status}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
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

                            {['pending', 'confirmed'].includes(selectedBooking.status) && (
                                <>
                                    <button
                                        onClick={async () => {
                                            setIsSeating(true);
                                            const res = await seatBooking(selectedBooking.id);
                                            setIsSeating(false);
                                            if (res.success) {
                                                toast.success('🪑 Cliente en silla');
                                                setSelectedBooking(null);
                                                router.refresh();
                                            } else {
                                                toast.error(res.error || 'Error');
                                            }
                                        }}
                                        disabled={isSeating}
                                        className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                                    >
                                        {isSeating ? 'Procesando...' : '🪑 Atender (Sentar)'}
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setEditBooking(selectedBooking);
                                                setSelectedBooking(null);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 rounded-xl transition-all border border-gray-200"
                                        >
                                            <Pencil size={12} />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleCancel(selectedBooking)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-all border border-red-200"
                                        >
                                            <XCircle size={12} />
                                            Cancelar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button onClick={() => setSelectedBooking(null)} className="w-full mt-3 text-gray-400 text-xs font-bold hover:text-black py-2">
                            Cerrar
                        </button>
                    </motion.div>
                </div>
            )}

            {/* MODALS */}
            {isNewBookingOpen && (
                <NewBookingModal tenantId={tenantId} services={services} staff={staff} onClose={() => setIsNewBookingOpen(false)} />
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
                    staff={staff}
                    staffSchedules={staffSchedules}
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
