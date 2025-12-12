import { getTenantIdForAdmin } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import PosV2 from "@/components/admin/pos/PosV2";
import { getTodayRange } from "@/lib/dates";

export const dynamic = 'force-dynamic';

// Types for Supabase joined data
interface PosTicketData {
    id: string;
    start_time: string;
    notes: string | null;
    staff_id: string;
    profiles: { id: string; full_name: string } | null;
    services: { id: string; name: string; price: number; duration_min: number } | null;
}

interface PosBookingData {
    id: string;
    start_time: string;
    end_time: string;
    notes: string | null;
    status: string;
    customer_id: string | null;
    profiles: { id: string; full_name: string } | null;
    services: { id: string; name: string; price: number; duration_min: number } | null;
    customer: { full_name: string; phone: string; no_show_count: number } | null;
}

export default async function PosPage() {
    const supabase = createAdminClient();
    const tenantId = await getTenantIdForAdmin();

    if (!tenantId) return redirect("/login");

    // Fetch staff
    const { data: staff } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("tenant_id", tenantId)
        .in("role", ["owner", "staff"])
        .eq("is_active_barber", true);

    // Fetch services with category
    const { data: services } = await supabase
        .from("services")
        .select("id, name, price, duration_min, category")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

    const { startISO, endISO } = getTodayRange();

    // Fetch active tickets (status = 'seated')
    const { data: activeTickets } = await supabase
        .from("bookings")
        .select(`
            id, start_time, notes, staff_id,
            profiles:staff_id ( id, full_name ),
            services:service_id ( id, name, price, duration_min )
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "seated")
        .gte("start_time", startISO)
        .lte("start_time", endISO)
        .order("start_time", { ascending: false });

    // Fetch today's confirmed bookings
    const { data: todayBookings } = await supabase
        .from("bookings")
        .select(`
            id, start_time, end_time, notes, status, customer_id,
            profiles:staff_id ( id, full_name ),
            services:service_id ( id, name, price, duration_min ),
            customer:customer_id ( full_name, phone, no_show_count )
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "confirmed")
        .gte("start_time", startISO)
        .lte("start_time", endISO)
        .order("start_time", { ascending: true });

    // Format tickets for PosV2
    const formattedTickets = (activeTickets as unknown as PosTicketData[])?.map(t => ({
        id: t.id,
        startTime: t.start_time,
        clientName: t.notes?.replace("Walk-in: ", "") || "Walk-in",
        staffName: t.profiles?.full_name || "Staff",
        staffId: t.profiles?.id || t.staff_id,
        services: t.services ? [{
            id: t.services.id,
            name: t.services.name,
            price: t.services.price,
            duration_min: t.services.duration_min
        }] : [],
        status: 'active' as const
    })) || [];

    // Format bookings for PosV2
    const formattedBookings = (todayBookings as unknown as PosBookingData[])?.map(b => ({
        id: b.id,
        startTime: b.start_time,
        endTime: b.end_time,
        clientName: b.customer?.full_name || b.notes?.split('|')[0]?.replace('Cliente:', '').trim() || "Cliente",
        clientPhone: b.customer?.phone || "",
        staffId: b.profiles?.id || "",
        staffName: b.profiles?.full_name || "Staff",
        serviceName: b.services?.name || "Servicio",
        servicePrice: b.services?.price || 0,
        duration: b.services?.duration_min || 30,
        status: b.status,
        customerId: b.customer_id || null,
        noShowCount: b.customer?.no_show_count || 0,
    })) || [];

    return (
        <PosV2
            staff={staff || []}
            services={services || []}
            activeTickets={formattedTickets}
            todayBookings={formattedBookings}
            tenantId={tenantId}
        />
    );
}