import { createClient, getTenantId } from "@/utils/supabase/server";
import BookingsCalendar from "@/components/admin/calendar/BookingsCalendar";
import { PosBookingData } from "@/types/supabase-joined";
import { redirect } from "next/navigation";
import { startOfWeek, endOfWeek, subDays, addDays } from 'date-fns';

export default async function AdminBookingsPage() {
    const supabase = await createClient();
    const tenantId = await getTenantId();

    if (!tenantId) return redirect('/login');
    const { data: { user } } = await supabase.auth.getUser();

    // Obtener rol del usuario actual
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    const currentUserRole = profile?.role || 'staff';

    // Rango de fechas: Cargar un rango amplio para navegación fluida (ej. 2 semanas alrededor de hoy)
    // O mejor, cargar todo el mes, o filtrar dinámicamente. 
    // Para simplificar y rendimiento: Cargar +- 7 días desde hoy.
    const today = new Date();
    const startDate = subDays(today, 7).toISOString();
    const endDate = addDays(today, 14).toISOString();

    const { data: bookings } = await supabase
        .from("bookings")
        .select(`
            *, 
            services ( name, price, duration_min ),
            profiles:staff_id ( full_name, avatar_url )
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
        .in("role", ["owner", "staff"])
        .eq("is_active_barber", true);

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 pb-0 h-screen overflow-hidden">
            <BookingsCalendar
                bookings={(bookings || []) as unknown as PosBookingData[]}
                staff={staff || []}
                services={services || []}
                tenantId={tenantId}
                currentUserRole={currentUserRole}
            />
        </div>
    );
}