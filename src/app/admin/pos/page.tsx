import { createClient, getTenantId } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PosInterface from "@/components/admin/pos/PosInterface";
import { getTodayRange } from "@/lib/dates";
import { PosTicketData, PosBookingData } from "@/types/supabase-joined";

export const dynamic = 'force-dynamic';

export default async function PosPage() {
    const supabase = await createClient();
    const tenantId = await getTenantId();

    if (!tenantId) return redirect("/login");

    const { data: staff } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("tenant_id", tenantId)
        .in("role", ["owner", "staff"])
        .eq("is_active_barber", true);

    const { data: services } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name", { ascending: true });

    const { startISO, endISO } = getTodayRange();

    const { data: activeTickets } = await supabase
        .from("bookings")
        .select(`
            id, start_time, notes,
            profiles:staff_id ( full_name ),
            services:service_id ( name, price )
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "seated")
        .gte("start_time", startISO)
        .lte("start_time", endISO)
        .order("start_time", { ascending: false });

    // Reservas web confirmadas para hoy
    const { data: todayBookings } = await supabase
        .from("bookings")
        .select(`
            id, start_time, end_time, notes, status, customer_id,
            profiles:staff_id ( id, full_name ),
            services:service_id ( name, price, duration_min ),
            customer_id,
            customer:customer_id ( full_name, phone, no_show_count )
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "confirmed")
        .gte("start_time", startISO)
        .lte("start_time", endISO)
        .order("start_time", { ascending: true });

    console.log('=== DEBUG POS ===');
    console.log('startISO:', startISO);
    console.log('endISO:', endISO);
    console.log('todayBookings:', todayBookings);



    const formattedTickets = (activeTickets as unknown as PosTicketData[])?.map(t => ({
        id: t.id,
        startTime: t.start_time,
        clientName: t.notes?.replace("Walk-in: ", "") || "Anónimo",
        staffName: t.profiles?.full_name || "Staff",
        serviceName: t.services?.name || "Servicio",
        price: t.services?.price || 0
    })) || [];

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
        isWebBooking: true,
        customerId: b.customer_id || null,
        noShowCount: b.customer?.no_show_count || 0,
    })) || [];

    console.log('formattedBookings:', formattedBookings);

    return (
        <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden">
            <PosInterface
                staff={staff || []}
                services={services || []}
                activeTickets={formattedTickets}
                todayBookings={formattedBookings}
                tenantId={tenantId}
            />
        </div>
    );
}