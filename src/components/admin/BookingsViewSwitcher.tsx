'use client';

import { useState } from 'react';
import { PosBookingData } from '@/types/supabase-joined';
import { Calendar, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import BookingsCalendar from './calendar/BookingsCalendar';
import BookingsListView from './bookings/BookingsListView';

type StaffMember = {
    id: string;
    full_name: string;
    avatar_url?: string | null;
};

type Service = {
    id: string;
    name: string;
    duration_min: number;
    price?: number;
};

export type StaffSchedule = {
    staff_id: string;
    day: string; // 'monday', 'tuesday', etc.
    start_time: string;
    end_time: string;
};

interface BookingsViewSwitcherProps {
    bookings: PosBookingData[];
    staff: StaffMember[];
    services: Service[];
    tenantId: string;
    currentUserRole: string;
    startHour?: number;
    endHour?: number;
    staffSchedules?: StaffSchedule[];
}

export default function BookingsViewSwitcher({
    bookings,
    staff,
    services,
    tenantId,
    currentUserRole,
    startHour = 9,
    endHour = 21,
    staffSchedules = []
}: BookingsViewSwitcherProps) {
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    return (
        <div className="h-full flex flex-col">
            {/* View Toggle - Fixed at top */}
            <div className="flex items-center justify-center gap-2 mb-4">
                <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                            viewMode === 'calendar'
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Calendar size={16} />
                        <span className="hidden sm:inline">Calendario</span>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                            viewMode === 'list'
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <List size={16} />
                        <span className="hidden sm:inline">Lista</span>
                    </button>
                </div>
            </div>

            {/* View Content */}
            <div className="flex-1 min-h-0">
                {viewMode === 'calendar' ? (
                    <BookingsCalendar
                        bookings={bookings}
                        staff={staff}
                        services={services}
                        tenantId={tenantId}
                        currentUserRole={currentUserRole}
                        startHour={startHour}
                        endHour={endHour}
                        staffSchedules={staffSchedules}
                    />
                ) : (
                    <BookingsListView
                        bookings={bookings}
                        staff={staff}
                        services={services}
                        tenantId={tenantId}
                        staffSchedules={staffSchedules}
                    />
                )}
            </div>
        </div>
    );
}
