'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PosBookingData } from '@/types/supabase-joined';
import { format, isSameDay, addDays, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    User,
    Scissors,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Calendar,
    Plus,
    Pencil,
    MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { cancelBookingAdmin } from '@/app/admin/bookings/actions';
import { toast } from 'sonner';
import NewBookingModal from '../NewBookingModal';
import EditBookingModal from './EditBookingModal';
import WhatsAppNotifyModal from './WhatsAppNotifyModal';
import type { StaffSchedule } from '../BookingsViewSwitcher';

const TIMEZONE = DEFAULT_TIMEZONE;

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

interface BookingsListViewProps {
    bookings: PosBookingData[];
    staff: StaffMember[];
    services: Service[];
    tenantId: string;
    staffSchedules?: StaffSchedule[];
}

const statusConfig = {
    completed: {
        label: 'Pagado',
        icon: CheckCircle2,
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200'
    },
    confirmed: {
        label: 'Confirmado',
        icon: Clock,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200'
    },
    pending: {
        label: 'Pendiente',
        icon: Clock,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200'
    },
    seated: {
        label: 'En Silla',
        icon: User,
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200'
    },
    cancelled: {
        label: 'Cancelado',
        icon: XCircle,
        bgColor: 'bg-red-50',
        textColor: 'text-red-600',
        borderColor: 'border-red-200'
    },
    no_show: {
        label: 'No Show',
        icon: AlertCircle,
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-600',
        borderColor: 'border-orange-200'
    },
};

export default function BookingsListView({
    bookings,
    staff,
    services,
    tenantId,
    staffSchedules = [],
}: BookingsListViewProps) {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);

    // Edit modal state
    const [editBooking, setEditBooking] = useState<PosBookingData | null>(null);

    // WhatsApp notification modal state
    const [waModal, setWaModal] = useState<{
        isOpen: boolean;
        variant: 'reschedule' | 'cancel';
        clientName: string;
        clientPhone: string | null;
        dateFormatted?: string;
        timeFormatted?: string;
    }>({ isOpen: false, variant: 'cancel', clientName: '', clientPhone: null });

    // Filter bookings for current date
    const dailyBookings = bookings
        .filter(b => {
            const bookingDate = toZonedTime(b.start_time, TIMEZONE);
            return isSameDay(bookingDate, currentDate);
        })
        .filter(b => statusFilter === 'all' || b.status === statusFilter)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Stats for the day
    const stats = {
        total: dailyBookings.length,
        completed: dailyBookings.filter(b => b.status === 'completed').length,
        pending: dailyBookings.filter(b => ['pending', 'confirmed', 'seated'].includes(b.status)).length,
        cancelled: dailyBookings.filter(b => ['cancelled', 'no_show'].includes(b.status)).length,
    };

    // Resolve client info from booking
    const getClientInfo = (booking: PosBookingData) => {
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

        // Phone: guest_phone first, then parse from notes, then customer.phone
        if (booking.guest_phone) {
            clientPhone = booking.guest_phone;
        } else if (booking.notes?.includes('Tel:')) {
            const telMatch = booking.notes.match(/Tel:\s*([^\s|]+)/);
            if (telMatch) clientPhone = telMatch[1];
        } else if (booking.customer?.phone) {
            clientPhone = booking.customer.phone;
        }

        return { clientName, clientPhone };
    };

    // Handle cancel
    const handleCancel = async (booking: PosBookingData) => {
        const { clientName, clientPhone } = getClientInfo(booking);

        if (!confirm(`¿Cancelar la cita de ${clientName}?`)) return;

        const result = await cancelBookingAdmin(booking.id, 'Cancelado desde lista de citas');

        if (result?.error) {
            toast.error(result.error);
            return;
        }

        toast.success('Cita cancelada');
        router.refresh();

        // Format date for WhatsApp message
        const startDate = toZonedTime(booking.start_time, TIMEZONE);
        const dateFormatted = format(startDate, "EEEE d 'de' MMMM", { locale: es });
        const timeFormatted = format(startDate, 'h:mm a');

        // Show WhatsApp notification modal
        setWaModal({
            isOpen: true,
            variant: 'cancel',
            clientName,
            clientPhone,
            dateFormatted,
            timeFormatted,
        });
    };

    // Handle edit success → show WhatsApp notification
    const handleEditSuccess = (booking: PosBookingData, dateFormatted: string, timeFormatted: string) => {
        const { clientName, clientPhone } = getClientInfo(booking);
        router.refresh();
        setWaModal({
            isOpen: true,
            variant: 'reschedule',
            clientName,
            clientPhone,
            dateFormatted,
            timeFormatted,
        });
    };

    const isActionable = (status: string) => ['confirmed', 'pending'].includes(status);

    return (
        <div className="flex flex-col h-[calc(100dvh-100px)] bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">

            {/* HEADER */}
            <div className="flex flex-col gap-4 p-4 md:p-6 border-b border-gray-100 bg-white">
                {/* Title Row */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Calendar className="text-gray-900" strokeWidth={2.5} size={20} />
                        Lista de Citas
                    </h2>
                    <button
                        onClick={() => setIsNewBookingOpen(true)}
                        className="bg-black text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-lg"
                    >
                        <Plus size={16} strokeWidth={3} />
                        Nueva
                    </button>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center justify-center bg-gray-50 rounded-2xl p-1.5 border border-gray-200">
                    <button
                        onClick={() => setCurrentDate(prev => subDays(prev, 1))}
                        className="p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500 hover:text-black"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1 px-4 font-bold text-sm text-gray-700 text-center capitalize">
                        {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
                    </div>
                    <button
                        onClick={() => setCurrentDate(prev => addDays(prev, 1))}
                        className="p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500 hover:text-black"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-2">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={cn(
                            "p-3 rounded-xl text-center transition-all",
                            statusFilter === 'all'
                                ? "bg-gray-900 text-white"
                                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        )}
                    >
                        <div className="text-lg font-bold">{stats.total}</div>
                        <div className="text-[10px] font-medium uppercase">Total</div>
                    </button>
                    <button
                        onClick={() => setStatusFilter('completed')}
                        className={cn(
                            "p-3 rounded-xl text-center transition-all",
                            statusFilter === 'completed'
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        )}
                    >
                        <div className="text-lg font-bold">{stats.completed}</div>
                        <div className="text-[10px] font-medium uppercase">Pagados</div>
                    </button>
                    <button
                        onClick={() => setStatusFilter('pending')}
                        className={cn(
                            "p-3 rounded-xl text-center transition-all",
                            statusFilter === 'pending'
                                ? "bg-amber-600 text-white"
                                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        )}
                    >
                        <div className="text-lg font-bold">{stats.pending}</div>
                        <div className="text-[10px] font-medium uppercase">Pendientes</div>
                    </button>
                    <button
                        onClick={() => setStatusFilter('cancelled')}
                        className={cn(
                            "p-3 rounded-xl text-center transition-all",
                            statusFilter === 'cancelled'
                                ? "bg-red-600 text-white"
                                : "bg-red-50 text-red-600 hover:bg-red-100"
                        )}
                    >
                        <div className="text-lg font-bold">{stats.cancelled}</div>
                        <div className="text-[10px] font-medium uppercase">Cancelados</div>
                    </button>
                </div>
            </div>

            {/* LIST BODY */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {dailyBookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Calendar size={48} strokeWidth={1} />
                        <p className="mt-4 font-medium">Sin citas para este día</p>
                        <p className="text-sm">Usa el botón + para agregar una</p>
                    </div>
                ) : (
                    dailyBookings.map(booking => {
                        const startDate = toZonedTime(booking.start_time, TIMEZONE);
                        const timeStr = format(startDate, 'h:mm a');

                        const { clientName } = getClientInfo(booking);
                        const serviceName = booking.services?.name || "Servicio";
                        const staffName = booking.profiles?.full_name?.split(' ')[0] || "Staff";
                        const price = booking.services?.price || 0;

                        const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.pending;
                        const StatusIcon = status.icon;
                        const canAct = isActionable(booking.status);

                        return (
                            <div
                                key={booking.id}
                                className={cn(
                                    "bg-white rounded-2xl p-4 border shadow-sm transition-all hover:shadow-md",
                                    status.borderColor,
                                    booking.status === 'cancelled' && "opacity-60"
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    {/* Left: Time & Info */}
                                    <div className="flex gap-3">
                                        {/* Time Badge */}
                                        <div className="flex flex-col items-center justify-center bg-gray-100 rounded-xl px-3 py-2 min-w-[70px]">
                                            <Clock size={12} className="text-gray-400 mb-1" />
                                            <span className="text-sm font-bold text-gray-900">{timeStr}</span>
                                        </div>

                                        {/* Client & Service Info */}
                                        <div className="flex flex-col justify-center">
                                            <h4 className={cn(
                                                "font-bold text-gray-900",
                                                booking.status === 'cancelled' && "line-through text-gray-500"
                                            )}>
                                                {clientName}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                <span className="flex items-center gap-1">
                                                    <Scissors size={10} />
                                                    {serviceName}
                                                </span>
                                                <span>•</span>
                                                <span>{staffName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Status & Price */}
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={cn(
                                            "text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1",
                                            status.bgColor,
                                            status.textColor
                                        )}>
                                            <StatusIcon size={10} />
                                            {status.label}
                                        </span>
                                        <span className="text-sm font-mono font-bold text-gray-700">
                                            ${price}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons - only for actionable bookings */}
                                {canAct && (
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => setEditBooking(booking)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
                                        >
                                            <Pencil size={12} />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleCancel(booking)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                                        >
                                            <XCircle size={12} />
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
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
                    onSuccess={(dateFormatted, timeFormatted) =>
                        handleEditSuccess(editBooking, dateFormatted, timeFormatted)
                    }
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
