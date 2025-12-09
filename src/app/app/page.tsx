// This is a server component
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getMyLoyaltyStatus } from './loyalty-actions';
import ClientDashboardUI from "@/components/client/ClientDashboardUI";

export default async function ClientAppPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    // Consultar Próxima Cita Activa
    const { data: upcomingBookings } = await supabase
        .from("bookings")
        .select(`
            id, start_time, status,
            services ( name, duration_min, price ),
            profiles:staff_id ( full_name, avatar_url )
        `)
        .eq("customer_id", user.id)
        .gte("start_time", new Date().toISOString())
        .neq("status", "cancelled")
        .neq("status", "completed")
        .neq("status", "no_show")
        .order("start_time", { ascending: true })
        .limit(1);

    const nextBooking = upcomingBookings?.[0];

    // Consultar Citas Pasadas (historial)
    const { data: pastBookings } = await supabase
        .from("bookings")
        .select(`
            id, start_time, status,
            services ( name, duration_min, price ),
            profiles:staff_id ( full_name, avatar_url )
        `)
        .eq("customer_id", user.id)
        .or('status.eq.completed,status.eq.cancelled,status.eq.no_show')
        .order("start_time", { ascending: false })
        .limit(10);

    const { data: history } = await supabase
        .from("transactions")
        .select("amount, created_at, points_earned, services(name)")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

    // Cargar estado de lealtad
    const loyaltyStatus = await getMyLoyaltyStatus();

    // Ver si hubo un no-show reciente (últimas 24h)
    const { data: lastNoShow } = await supabase
        .from("bookings")
        .select("start_time, services(name)")
        .eq("customer_id", user.id)
        .eq("status", "no_show")
        .order("start_time", { ascending: false })
        .limit(1)
        .single();

    // Check si es reciente (ej. hoy o ayer)
    const showNoShowAlert = lastNoShow &&
        new Date(lastNoShow.start_time).getTime() > Date.now() - 48 * 60 * 60 * 1000;

    return (
        <ClientDashboardUI
            user={user}
            profile={profile}
            role={profile?.role || 'client'}
            nextBooking={nextBooking ?? null}
            pastBookings={pastBookings || []}
            history={history || []}
            loyaltyStatus={loyaltyStatus}
            showNoShowAlert={!!showNoShowAlert}
        />
    );
}