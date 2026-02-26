import { createClient, getTenantIdForAdmin } from "@/utils/supabase/server";
import BookingsViewSwitcher from "@/components/admin/BookingsViewSwitcher";
import { PosBookingData } from "@/types/supabase-joined";
import { redirect } from "next/navigation";
import { subDays, addDays } from 'date-fns';

export const dynamic = 'force-dynamic';

// Helper to parse "HH:MM" or "HH:MM:SS" to hour number
function parseTimeToHour(timeStr: string): number {
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10);
}

export default async function BookingsPage() {
    const supabase = await createClient();
    const tenantId = await getTenantIdForAdmin();

    if (!tenantId) return redirect('/login');
    const { data: { user } } = await supabase.auth.getUser();

    // Obtener rol del usuario actual
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    const currentUserRole = profile?.role || 'staff';

    // Rango de fechas: +- 7 días desde hoy
    const today = new Date();
    const startDate = subDays(today, 7).toISOString();
    const endDate = addDays(today, 14).toISOString();

    const { data: bookings } = await supabase
        .from("bookings")
        .select(`
            *, 
            services ( name, price, duration_min ),
            profiles:staff_id ( full_name, avatar_url ),
            customer:customer_id ( full_name, phone )
        `)
        .eq("tenant_id", tenantId)
        .gte("start_time", startDate)
        .lte("start_time", endDate)
        .order("start_time", { ascending: true });

    const { data: services } = await supabase
        .from("services")
        .select("id, name, duration_min, price")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

    const { data: staff } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("tenant_id", tenantId)
        .in("role", ["owner", "staff", "super_admin"])
        .eq("is_active_barber", true)
        .order("created_at");

    // ============ DYNAMIC HOURS CALCULATION ============
    // Fetch all schedules for active barbers 
    const staffIds = staff?.map(s => s.id) || [];

    let startHour = 9;  // Default
    let endHour = 21;   // Default
    let schedules: { staff_id: string; day_of_week: number; start_time: string; end_time: string }[] = [];

    if (staffIds.length > 0) {
        const { data: fetchedSchedules } = await supabase
            .from("staff_schedules")
            .select("staff_id, day_of_week, start_time, end_time")
            .in("staff_id", staffIds)
            .eq("is_active", true);

        schedules = fetchedSchedules || [];

        if (schedules.length > 0) {
            // Find earliest start and latest end
            let minStart = 24;
            let maxEnd = 0;

            for (const schedule of schedules) {
                const start = parseTimeToHour(schedule.start_time);
                const end = parseTimeToHour(schedule.end_time);

                if (start < minStart) minStart = start;
                if (end > maxEnd) maxEnd = end;
            }

            // Apply visual buffer: -1 hour start, +1 hour end
            startHour = Math.max(0, minStart - 1);
            endHour = Math.min(23, maxEnd + 1);

            // Ensure at least 6 hour range for usability
            if (endHour - startHour < 6) {
                endHour = startHour + 6;
            }
        }
    }

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 pb-0 h-screen overflow-hidden">
            <BookingsViewSwitcher
                bookings={(bookings || []) as unknown as PosBookingData[]}
                staff={staff || []}
                services={services || []}
                tenantId={tenantId}
                currentUserRole={currentUserRole}
                startHour={startHour}
                endHour={endHour}
                staffSchedules={schedules || []}
            />
        </div>
    );
}