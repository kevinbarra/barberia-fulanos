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
// import BookingDetailModal from './BookingDetailModal'; // To be implemented if complex interactions needed

const TIMEZONE = 'America/Mexico_City';
const START_HOUR = 9; // 9 AM
const END_HOUR = 21; // 9 PM
const CELL_HEIGHT = 120; // Pixels per hour

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
}

export default function BookingsCalendar({ bookings, staff, services, tenantId, currentUserRole }: BookingsCalendarProps) {
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

    // Time slots generation
    const timeSlots = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

    // Calculate position and height
    const getBookingStyle = (startTimeStr: string, durationMin: number) => {
        const startDate = toZonedTime(startTimeStr, TIMEZONE);
        const startHour = startDate.getHours();
        const startMin = startDate.getMinutes();

        const top = ((startHour - START_HOUR) * CELL_HEIGHT) + ((startMin / 60) * CELL_HEIGHT);
        const height = (durationMin / 60) * CELL_HEIGHT;

        return { top: `${top}px`, height: `${height}px` };
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">

            {/* HEADER SUPERIOR */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white z-20">
                <div className="flex items-center gap-6">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <CalendarIcon className="text-gray-900" strokeWidth={2.5} />
                        Agenda
                    </h2>

                    {/* Date Navigation */}
                    <div className="flex items-center bg-gray-50 rounded-full p-1 border border-gray-200">
                        <button
                            onClick={() => setCurrentDate(prev => subDays(prev, 1))}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-500 hover:text-black"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="px-4 font-bold text-sm text-gray-700 w-40 text-center capitalize">
                            {format(currentDate, 'EEEE d MMMM')}
                        </div>
                        <button
                            onClick={() => setCurrentDate(prev => addDays(prev, 1))}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-500 hover:text-black"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => setIsNewBookingOpen(true)}
                    className="bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-lg shadow-gray-200 hover:shadow-xl active:scale-95"
                >
                    <Plus size={18} strokeWidth={3} />
                    Nueva Cita
                </button>
            </div>

            {/* CALENDAR BODY */}
            <div className="flex-1 overflow-y-auto relative scroll-smooth bg-gray-50/50">
                <div className="flex min-w-[800px]">

                    {/* TIME COLUMN */}
                    <div className="w-20 flex-shrink-0 bg-white border-r border-gray-100 z-10 sticky left-0">
                        <div className="h-10 border-b border-gray-100 bg-gray-50"></div> {/* Spacer for Staff Header */}
                        {timeSlots.map(hour => (
                            <div key={hour} className="relative border-b border-gray-50 text-right pr-3 text-xs font-bold text-gray-400" style={{ height: `${CELL_HEIGHT}px` }}>
                                <span className="relative -top-2 bg-white px-1">
                                    {format(setMinutes(setHours(new Date(), hour), 0), 'h aaa')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* STAFF COLUMNS */}
                    <div className="flex-1 flex relative">
                        {/* Background Grid Lines (Horizontal) */}
                        <div className="absolute inset-0 z-0 pointer-events-none">
                            <div className="h-10"></div>
                            {timeSlots.map(hour => (
                                <div key={hour} className="border-b border-dashed border-gray-200 w-full" style={{ height: `${CELL_HEIGHT}px` }}></div>
                            ))}
                        </div>

                        {staff.map(member => (
                            <div key={member.id} className="flex-1 min-w-[180px] border-r border-gray-100 relative group">

                                {/* STAFF HEADER */}
                                <div className="h-14 border-b border-gray-100 bg-white sticky top-0 z-10 flex items-center gap-3 px-4 shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden relative border border-gray-100">
                                        {member.avatar_url ? (
                                            <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <User size={14} />
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-bold text-gray-700 text-sm truncate">{member.full_name}</span>
                                </div>

                                {/* BOOKINGS COLUMN */}
                                <div className="relative z-0" style={{ height: `${(END_HOUR - START_HOUR + 1) * CELL_HEIGHT}px` }}>
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

                                            const statusColor =
                                                booking.status === 'completed' ? 'bg-zinc-100 border-zinc-200 text-zinc-500 grayscale' :
                                                    booking.status === 'confirmed' ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-blue-100' :
                                                        booking.status === 'seated' ? 'bg-green-50 border-green-200 text-green-900 shadow-green-100 ring-2 ring-green-500/20' :
                                                            booking.status === 'no_show' ? 'bg-red-50 border-red-200 text-red-900 opacity-60' :
                                                                'bg-gray-50 border-gray-200 text-gray-700';

                                            return (
                                                <motion.div
                                                    key={booking.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    onClick={() => setSelectedBooking(booking)}
                                                    className={cn(
                                                        "absolute left-1 right-1 rounded-xl border p-2 cursor-pointer transition-all hover:brightness-95 hover:z-10 shadow-sm",
                                                        statusColor
                                                    )}
                                                    style={{ top, height }}
                                                >
                                                    <div className="flex flex-col h-full justify-between overflow-hidden">
                                                        <div>
                                                            <div className="flex justify-between items-start gap-1">
                                                                <span className="font-bold text-xs truncate leading-tight">{clientDisplay}</span>
                                                                <span className="text-[10px] opacity-70 font-mono font-medium whitespace-nowrap">
                                                                    {format(toZonedTime(booking.start_time, TIMEZONE), 'h:mm')}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] opacity-80 truncate mt-0.5">{serviceName}</div>
                                                        </div>

                                                        {(parseInt(height) > 60) && (
                                                            <div className="flex justify-between items-end">
                                                                <span className="text-[10px] font-bold opacity-60">${price}</span>
                                                                {booking.status === 'seated' && (
                                                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
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
                                                top: `${((new Date().getHours() - START_HOUR) * CELL_HEIGHT) + ((new Date().getMinutes() / 60) * CELL_HEIGHT)}px`
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
