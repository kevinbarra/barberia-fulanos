'use client';

import { PosBookingData } from '@/types/supabase-joined';
import { useMemo, useState } from 'react';
import { format, isSameDay, isAfter, isBefore, addDays, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import BookingsCalendar from '../calendar/BookingsCalendar';

interface Props {
    bookings: PosBookingData[];
    staff: any[];
    services: any[];
}

export default function DesktopDashboard({ bookings, staff, services }: Props) {
    const today = new Date();

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

    return (
        <div className="p-6 h-[calc(100dvh-100px)] flex flex-col bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden">
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex-shrink-0">Dashboard General</h2>

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

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
                <BookingsCalendar
                    bookings={bookings}
                    staff={staff}
                    services={services}
                    tenantId={staff[0]?.tenant_id || ""}
                    currentUserRole="admin"
                />
            </div>
        </div>
    );
}
