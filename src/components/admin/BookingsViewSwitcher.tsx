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
    // Default to LIST view
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

    // Shared staff filter — persists across view switches
    const [soloStaffId, setSoloStaffId] = useState<string | null>(null);

    return (
        <div className="h-full flex flex-col">
            {/* Header: Staff Filter + View Toggle */}
            {/* pr-14 on mobile/tablet clears the fixed notification bell (top-4 right-4) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pr-14 lg:pr-0">
                {/* Left: Staff Filter Pills — scrollable on mobile */}
                <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl p-1 overflow-x-auto min-w-0 scrollbar-hide">
                    <button
                        onClick={() => setSoloStaffId(null)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0",
                            !soloStaffId ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Todos
                    </button>
                    {staff.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSoloStaffId(soloStaffId === s.id ? null : s.id)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0",
                                soloStaffId === s.id ? "bg-black text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                            title={s.full_name}
                        >
                            {s.full_name.split(' ')[0]}
                        </button>
                    ))}
                </div>

                {/* Right: View Toggle — fixed width, never wraps */}
                <div className="bg-gray-100 p-1 rounded-xl flex gap-1 flex-shrink-0 self-start sm:self-auto">
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
                        soloStaffId={soloStaffId}
                        onSoloStaffChange={setSoloStaffId}
                    />
                ) : (
                    <BookingsListView
                        bookings={bookings}
                        staff={staff}
                        services={services}
                        tenantId={tenantId}
                        staffSchedules={staffSchedules}
                        soloStaffId={soloStaffId}
                    />
                )}
            </div>
        </div>
    );
}
