'use client';
import { useState } from 'react';
import { PosBookingData } from '@/types/supabase-joined';
import DesktopDashboard from './dashboard/DesktopDashboard';
import TabletTimeline from './calendar/TabletTimeline';
import PocketAgenda from './calendar/PocketAgenda';

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
    workflowMode?: 'auto' | 'manual';
}

export default function BookingsViewSwitcher({
    bookings,
    staff,
    services,
    tenantId,
    currentUserRole,
    startHour = 9,
    endHour = 21,
    staffSchedules = [],
    workflowMode = 'manual'
}: BookingsViewSwitcherProps) {
    // Shared staff filter — persists across view switches
    const [soloStaffId, setSoloStaffId] = useState<string | null>(null);

    return (
        <div className="h-full w-full relative">
            {/* MOBILE ONLY (< 768px) */}
            <div className="block md:hidden h-full absolute inset-0">
                <PocketAgenda bookings={bookings} staff={staff} services={services} />
            </div>

            {/* TABLET ONLY (768px -> 1024px) */}
            <div className="hidden md:block lg:hidden h-full absolute inset-0">
                <TabletTimeline
                    bookings={bookings}
                    staff={staff}
                    services={services}
                    tenantId={tenantId}
                    currentUserRole={currentUserRole}
                />
            </div>

            {/* DESKTOP ONLY (>= 1024px) */}
            <div className="hidden lg:block h-full absolute inset-0">
                <DesktopDashboard
                    bookings={bookings}
                    staff={staff}
                    services={services}
                    tenantId={tenantId}
                    staffSchedules={staffSchedules}
                    workflowMode={workflowMode}
                />
            </div>
        </div>
    );
}
