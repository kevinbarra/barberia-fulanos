import { createClient, getTenantId } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PosInterface from "@/components/admin/pos/PosInterface";
import { getTodayRange } from "@/lib/dates";

export default async function PosPage() {
    const supabase = await createClient();
    const tenantId = await getTenantId();

    if (!tenantId) return redirect("/login");

    // 1. Cargar Barberos (Activos)
    const { data: staff } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("tenant_id", tenantId)
        .in("role", ["owner", "staff"])
        .eq("is_active_barber", true);

    // 2. Cargar Servicios (Activos)
    const { data: services } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name", { ascending: true });

    // 3. Cargar Tickets Abiertos (NUEVO)
    // Buscamos citas de HOY que estén 'seated' (en silla)
    const { startISO, endISO } = getTodayRange();

    const { data: activeTickets } = await supabase
        .from("bookings")
        .select(`
            id, start_time, notes,
            profiles:staff_id ( full_name ),
            services:service_id ( name, price )
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "seated") // Solo los que están en proceso
        .gte("start_time", startISO)
        .lte("start_time", endISO)
        .order("start_time", { ascending: false });

    // Mapeo seguro para el componente
    const formattedTickets = activeTickets?.map(t => ({
        id: t.id,
        startTime: t.start_time,
        clientName: t.notes?.replace("Walk-in: ", "") || "Anónimo",
        // @ts-ignore
        staffName: t.profiles?.full_name || "Staff",
        // @ts-ignore
        serviceName: t.services?.name || "Servicio",
        // @ts-ignore
        price: t.services?.price || 0
    })) || [];

    return (
        <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden">
            {/* El Layout de Admin ya pone el Sidebar en Desktop, 
                así que aquí solo manejamos el contenido del área principal */}
            <PosInterface
                staff={staff || []}
                services={services || []}
                activeTickets={formattedTickets}
                tenantId={tenantId}
            />
        </div>
    );
}