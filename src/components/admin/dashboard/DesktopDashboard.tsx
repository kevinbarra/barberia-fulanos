'use client';

import { PosBookingData } from '@/types/supabase-joined';
import { useMemo, useState, useEffect } from 'react';
import { isSameDay, isAfter } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import BookingsCalendar from '../calendar/BookingsCalendar';
import BookingsListView from '../bookings/BookingsListView';
import type { StaffSchedule } from '../BookingsViewSwitcher';
import { LayoutList, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Redefining types if needed or importing from parent
interface Props {
    bookings: PosBookingData[];
    staff: any[];
    services: any[];
    tenantId: string;
    staffSchedules?: StaffSchedule[];
    workflowMode?: 'auto' | 'manual';
}

export default function DesktopDashboard({ bookings, staff, services, tenantId, staffSchedules = [], workflowMode = 'manual' }: Props) {
    const today = new Date();

    // View state with localStorage persistence
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const savedView = localStorage.getItem('fulanos_desktop_view_preference');
        if (savedView === 'calendar') {
            setViewMode('calendar');
        } else {
            setViewMode('list'); // Default to list view as requested by user
        }
    }, []);

    const handleViewToggle = (mode: 'list' | 'calendar') => {
        setViewMode(mode);
        localStorage.setItem('fulanos_desktop_view_preference', mode);
    };

    // KPIs Calculation
    const { todayRevenue, todayBookings, upcomingCount } = useMemo(() => {
        let revenue = 0;
        let count = 0;
        let upcoming = 0;

        bookings.forEach(b => {
            const bookingDate = toZonedTime(b.start_time, DEFAULT_TIMEZONE);

            if (isSameDay(bookingDate, today)) {
                count++;
                if (b.status === 'completed' || b.status === 'seated') {
                    revenue += (b.services?.price || 0);
                }
            }

            if (isAfter(bookingDate, today) || isSameDay(bookingDate, today)) {
                if (['pending', 'confirmed'].includes(b.status)) upcoming++;
            }
        });

        return { todayRevenue: revenue, todayBookings: count, upcomingCount: upcoming };
    }, [bookings]);

    // Render placeholder matching the container to avoid hydration shift jumps
    if (!isMounted) {
        return <div className="p-6 h-[calc(100dvh-100px)] flex flex-col bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden" />;
    }

    return (
        <div className="p-6 h-[calc(100dvh-100px)] flex flex-col bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h2 className="text-2xl font-black text-gray-900">Dashboard General</h2>

                {/* View Toggle */}
                <div className="flex bg-gray-200/50 p-1 rounded-xl shadow-inner border border-gray-200/50">
                    <button
                        onClick={() => handleViewToggle('list')}
                        className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
                            viewMode === 'list'
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                        )}
                        title="Vista de Lista"
                    >
                        <LayoutList size={16} />
                        Lista
                    </button>
                    <button
                        onClick={() => handleViewToggle('calendar')}
                        className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
                            viewMode === 'calendar'
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                        )}
                        title="Vista de Calendario"
                    >
                        <CalendarIcon size={16} />
                        Calendario (7 días)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6 flex-shrink-0">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Ingresos de Hoy (Est.)</p>
                    <p className="text-4xl font-black text-gray-900">${todayRevenue}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Citas Hoy</p>
                    <p className="text-4xl font-black text-gray-900">{todayBookings}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Próximas Citas (7 días)</p>
                    <p className="text-4xl font-black text-[#854fff]">{upcomingCount}</p>
                </div>
            </div>

            <div className="flex-1 rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
                {viewMode === 'list' ? (
                    <BookingsListView
                        bookings={bookings}
                        staff={staff}
                        services={services}
                        tenantId={tenantId}
                        staffSchedules={staffSchedules}
                        workflowMode={workflowMode}
                    />
                ) : (
                    <BookingsCalendar
                        bookings={bookings}
                        staff={staff}
                        services={services}
                        tenantId={tenantId}
                        currentUserRole="admin"
                    />
                )}
            </div>
        </div>
    );
}
