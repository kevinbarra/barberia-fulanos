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

    return (
        <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden">
            <PosInterface
                staff={staff || []}
                services={services || []}
                activeTickets={formattedTickets}
                tenantId={tenantId}
            />
        </div>
    );
}