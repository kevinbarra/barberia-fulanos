'use client';

import { useState } from 'react';
import { PosBookingData } from '@/types/supabase-joined';
import { format, addDays, subDays, isSameDay, setHours, setMinutes, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, User } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import NewBookingModal from '../NewBookingModal';
import { cn } from '@/lib/utils';
import CheckOutModal from '../CheckOutModal';
import { seatBooking } from '@/app/admin/pos/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
// import BookingDetailModal from './BookingDetailModal'; // To be implemented if complex interactions needed

const TIMEZONE = DEFAULT_TIMEZONE;
const CELL_HEIGHT = 120; // Pixels per hour - increased for better card readability
const MIN_COLUMN_WIDTH = 200; // Minimum width for each staff column
const TIME_COLUMN_WIDTH = 64; // Width of time column (w-16 = 64px)

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
    startHour?: number;  // Dynamic from schedules
    endHour?: number;    // Dynamic from schedules
}

export default function BookingsCalendar({
    bookings,
    staff,
    services,
    tenantId,
    currentUserRole,
    startHour = 9,
    endHour = 21
}: BookingsCalendarProps) {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<PosBookingData | null>(null);
    const [isSeating, setIsSeating] = useState(false);

    // Filter bookings for current date
    const dailyBookings = bookings.filter(b => {
        const bookingDate = toZonedTime(b.start_time, TIMEZONE);
        return isSameDay(bookingDate, currentDate);
    });

    // Time slots generation (dynamic)
    const timeSlots = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

    // Calculate position and height
    const getBookingStyle = (startTimeStr: string, durationMin: number) => {
        const startDate = toZonedTime(startTimeStr, TIMEZONE);
        const startHourVal = startDate.getHours();
        const startMin = startDate.getMinutes();

        const top = ((startHourVal - startHour) * CELL_HEIGHT) + ((startMin / 60) * CELL_HEIGHT);
        const height = (durationMin / 60) * CELL_HEIGHT;

        return { top: `${top}px`, height: `${height}px` };
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">

            {/* HEADER SUPERIOR - MOBILE FIRST */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:p-6 border-b border-gray-100 bg-white z-20">
                {/* Title - Hidden on mobile to save space */}
                <h2 className="hidden md:flex text-xl lg:text-2xl font-black text-gray-900 tracking-tight items-center gap-2">
                    <CalendarIcon className="text-gray-900" strokeWidth={2.5} />
                    Agenda
                </h2>

                {/* Date Navigation - Full width on mobile, centered */}
                <div className="flex items-center justify-center bg-gray-50 rounded-2xl p-1.5 border border-gray-200 w-full md:w-auto">
                    <button
                        onClick={() => setCurrentDate(prev => subDays(prev, 1))}
                        className="p-3 md:p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500 hover:text-black active:scale-95"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1 md:flex-none px-4 font-bold text-sm md:text-base text-gray-700 md:w-44 text-center capitalize">
                        {format(currentDate, 'EEE d MMM')}
                    </div>
                    <button
                        onClick={() => setCurrentDate(prev => addDays(prev, 1))}
                        className="p-3 md:p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500 hover:text-black active:scale-95"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* New Booking Button */}
                <button
                    onClick={() => setIsNewBookingOpen(true)}
                    className="bg-black text-white px-5 py-3 md:py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200 hover:shadow-xl active:scale-95 w-full md:w-auto"
                >
                    <Plus size={18} strokeWidth={3} />
                    Nueva Cita
                </button>
            </div>

            {/* CALENDAR BODY - Free horizontal scroll (no snap for usability) */}
            <div className="flex-1 overflow-y-auto overflow-x-auto relative scroll-smooth bg-gray-50/50">
                <div className="flex" style={{ minWidth: `${TIME_COLUMN_WIDTH + (staff.length * MIN_COLUMN_WIDTH)}px` }}>

                    {/* TIME COLUMN - High z-index, solid background to cover scrolling content */}
                    <div className="flex-shrink-0 bg-white border-r border-gray-200 z-50 sticky left-0 shadow-md" style={{ width: `${TIME_COLUMN_WIDTH}px` }}>
                        <div className="h-12 md:h-14 border-b border-gray-100 bg-gray-50 flex items-center justify-center">
                            <Clock size={14} className="text-gray-400" />
                        </div>
                        {timeSlots.map(hour => (
                            <div key={hour} className="relative border-b border-gray-100 bg-white text-right pr-2 md:pr-3 text-[10px] md:text-xs font-bold text-gray-400" style={{ height: `${CELL_HEIGHT}px` }}>
                                <span className="relative -top-2 bg-white px-1">
                                    {format(setMinutes(setHours(new Date(), hour), 0), 'h a')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* STAFF COLUMNS - Free scroll */}
                    <div className="flex-1 flex relative">
                        {/* Background Grid Lines (Horizontal) */}
                        <div className="absolute inset-0 z-0 pointer-events-none">
                            <div className="h-12 md:h-14"></div>
                            {timeSlots.map(hour => (
                                <div key={hour} className="border-b border-dashed border-gray-200 w-full" style={{ height: `${CELL_HEIGHT}px` }}></div>
                            ))}
                        </div>

                        {staff.map(member => (
                            <div
                                key={member.id}
                                className="flex-shrink-0 border-r border-gray-100 relative group"
                                style={{ width: `${MIN_COLUMN_WIDTH}px`, minWidth: `${MIN_COLUMN_WIDTH}px` }}
                            >

                                {/* STAFF HEADER - Higher z-index than cards */}
                                <div className="h-12 md:h-14 border-b border-gray-100 bg-white sticky top-0 z-30 flex items-center gap-2 md:gap-3 px-3 md:px-4 shadow-sm">
                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden relative border border-gray-100 flex-shrink-0">
                                        {member.avatar_url ? (
                                            <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <User size={12} />
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-bold text-gray-700 text-xs md:text-sm truncate">{member.full_name}</span>
                                </div>

                                {/* BOOKINGS COLUMN */}
                                <div className="relative z-0" style={{ height: `${(endHour - startHour + 1) * CELL_HEIGHT}px` }}>
                                    {dailyBookings
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        .filter(b => (b as any).staff_id === member.id || b.profiles?.id === member.id)
                                        .map(booking => {
                                            const duration = booking.services?.duration_min || 30;
                                            const { top, height } = getBookingStyle(booking.start_time, duration);

                                            // Lógica de visualización de nombre
                                            // Si hay customer vinculado, usamos su nombre. Si no, usamos las notas (Walk-in info)
                                            let clientDisplay = "Cliente";
                                            if (booking.customer?.full_name) {
                                                clientDisplay = booking.customer.full_name;
                                            } else if (booking.notes) {
                                                // Extract "Walk-in: Nombre" if present, or just use notes
                                                clientDisplay = booking.notes.replace('Walk-in: ', '').replace('WALK-IN | Cliente: ', '');
                                            }

                                            const serviceName = booking.services?.name || "Servicio General";
                                            const price = booking.services?.price || 0;

                                            // Google Calendar-style status colors with left border accent
                                            const statusStyles = {
                                                completed: 'bg-emerald-50 border-l-4 border-l-emerald-500 border-emerald-200 text-emerald-900',
                                                confirmed: 'bg-blue-50 border-l-4 border-l-blue-500 border-blue-200 text-blue-900',
                                                seated: 'bg-purple-50 border-l-4 border-l-purple-500 border-purple-200 text-purple-900 ring-2 ring-purple-300/30',
                                                no_show: 'bg-red-50 border-l-4 border-l-red-400 border-red-200 text-red-800 opacity-75',
                                                cancelled: 'bg-red-50 border-l-4 border-l-red-400 border-red-200 text-red-800 opacity-60 line-through decoration-red-300',
                                                pending: 'bg-amber-50 border-l-4 border-l-amber-500 border-amber-200 text-amber-900',
                                            };
                                            const statusColor = statusStyles[booking.status as keyof typeof statusStyles] || 'bg-gray-50 border-l-4 border-l-gray-400 border-gray-200 text-gray-700';

                                            return (
                                                <motion.div
                                                    key={booking.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    onClick={() => setSelectedBooking(booking)}
                                                    className={cn(
                                                        "absolute left-1.5 right-1.5 rounded-lg border shadow-sm cursor-pointer transition-all hover:shadow-md hover:brightness-[0.98] hover:z-10",
                                                        statusColor
                                                    )}
                                                    style={{ top, height, minHeight: '32px' }}
                                                >
                                                    <div className="flex flex-col h-full justify-between overflow-hidden p-1.5 md:p-2">
                                                        <div>
                                                            <div className="flex justify-between items-start gap-1">
                                                                <span className="font-bold text-[10px] md:text-xs truncate leading-tight">{clientDisplay}</span>
                                                                <span className="text-[9px] md:text-[10px] opacity-70 font-mono font-medium whitespace-nowrap">
                                                                    {format(toZonedTime(booking.start_time, TIMEZONE), 'h:mm')}
                                                                </span>
                                                            </div>
                                                            <div className="text-[9px] md:text-[10px] opacity-80 truncate mt-0.5">{serviceName}</div>
                                                        </div>

                                                        {(parseInt(height) > 50) && (
                                                            <div className="flex justify-between items-end">
                                                                <span className="text-[9px] md:text-[10px] font-bold opacity-60">${price}</span>
                                                                {booking.status === 'seated' && (
                                                                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}

                                    {/* CURRENT TIME INDICATOR (Only if Today) */}
                                    {isSameDay(currentDate, new Date()) && (
                                        <div
                                            className="absolute w-full border-t-2 border-red-500 z-10 pointer-events-none"
                                            style={{
                                                top: `${((new Date().getHours() - startHour) * CELL_HEIGHT) + ((new Date().getMinutes() / 60) * CELL_HEIGHT)}px`
                                            }}
                                        >
                                            <div className="w-2 h-2 bg-red-500 rounded-full -mt-[5px] -ml-[5px]"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {isNewBookingOpen && (
                <NewBookingModal
                    tenantId={tenantId}
                    services={services}
                    staff={staff}
                    onClose={() => setIsNewBookingOpen(false)}
                />
            )}

            {selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    {/* Simplified Detail/Checkout wrapper using existing modals? */}
                    {/* For now, reuse BookingCard in a modal box or similar. 
                         Actually, let's reuse CheckOutModal if action is checkout, 
                         or creating a QuickDetail modal. 
                         To not overengineer, I will allow basic actions here.
                     */}
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => setSelectedBooking(null)} className="absolute top-4 right-4 text-gray-400 hover:text-black">✕</button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                                👤
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">
                                    {selectedBooking.customer?.full_name ||
                                        selectedBooking.notes?.replace('Walk-in: ', '').replace('WALK-IN | Cliente: ', '') ||
                                        "Cliente"}
                                </h3>
                                <p className="text-gray-500 text-sm">{selectedBooking.services?.name || "Servicio General"}</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Hora</span>
                                <span className="font-bold">{format(toZonedTime(selectedBooking.start_time, TIMEZONE), 'h:mm a')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Staff</span>
                                <span className="font-bold">{selectedBooking.profiles?.full_name || "Equipo"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Estatus</span>
                                <span className={cn("font-bold capitalize",
                                    selectedBooking.status === 'completed' ? 'text-green-600' :
                                        selectedBooking.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'
                                )}>{selectedBooking.status.replace('_', ' ')}</span>
                            </div>
                        </div>

                        {selectedBooking.status === 'seated' && (
                            <CheckOutModal
                                booking={{
                                    id: selectedBooking.id,
                                    service_name: selectedBooking.services?.name || "Servicio",
                                    price: selectedBooking.services?.price || 0,
                                    client_name: selectedBooking.customer?.full_name || "Cliente"
                                }}
                                onClose={() => setSelectedBooking(null)}
                                inline={true}
                            />
                        )}

                        {(selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
                            <button
                                onClick={async () => {
                                    setIsSeating(true)
                                    const res = await seatBooking(selectedBooking.id)
                                    setIsSeating(false)
                                    if (res.success) {
                                        toast.success('🪑 Cliente en silla')
                                        setSelectedBooking(null)
                                        router.refresh()
                                    } else {
                                        toast.error(res.error || 'Error al sentar cliente')
                                    }
                                }}
                                disabled={isSeating}
                                className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {isSeating ? 'Procesando...' : '🪑 Atender (Sentar Cliente)'}
                            </button>
                        )}

                        {/* Fallback close if CheckOutModal is not rendered or explicit close needed */}
                        <button onClick={() => setSelectedBooking(null)} className="w-full mt-2 text-gray-400 text-xs font-bold hover:text-black py-2">
                            Cerrar Detalles
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
