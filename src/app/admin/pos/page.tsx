import { createClient, getTenantId } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PosInterface from "@/components/admin/pos/PosInterface";
import { getTodayRange } from "@/lib/dates";

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
            id, start_time, end_time, notes, status,
            profiles:staff_id ( id, full_name ),
            services:service_id ( name, price, duration_min ),
            customer:customer_id ( full_name, phone, no_show_count )
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "confirmed")
        .gte("start_time", startISO)
        .lte("start_time", endISO)
        .order("start_time", { ascending: true });

    const formattedTickets = activeTickets?.map(t => ({
        id: t.id,
        startTime: t.start_time,
        clientName: t.notes?.replace("Walk-in: ", "") || "Anónimo",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        staffName: (t.profiles as any)?.full_name || "Staff",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        serviceName: (t.services as any)?.name || "Servicio",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        price: (t.services as any)?.price || 0
    })) || [];

    const formattedBookings = todayBookings?.map(b => ({
        id: b.id,
        startTime: b.start_time,
        endTime: b.end_time,
        clientName: (b.customer as any)?.full_name || b.notes?.split('|')[0]?.replace('Cliente:', '').trim() || "Cliente",
        clientPhone: (b.customer as any)?.phone || "",
        staffId: (b.profiles as any)?.id,
        staffName: (b.profiles as any)?.full_name || "Staff",
        serviceName: (b.services as any)?.name || "Servicio",
        servicePrice: (b.services as any)?.price || 0,
        duration: (b.services as any)?.duration_min || 30,
        status: b.status,
        isWebBooking: true,
        noShowCount: (b.customer as any)?.no_show_count || 0
    })) || [];

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