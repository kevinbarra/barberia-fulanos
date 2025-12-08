import { createClient, getTenantId } from "@/utils/supabase/server";
import BookingCard from "@/components/admin/BookingCard";
import { PosBookingData } from "@/types/supabase-joined";
import AddBookingButton from "@/components/admin/AddBookingButton";
import { redirect } from "next/navigation";
// FIX: Importar funciones de zona horaria desde 'date-fns-tz'
import { toZonedTime, format } from 'date-fns-tz';
// FIX: Importar helpers lógicos desde 'date-fns'
import { isToday, isTomorrow } from 'date-fns';
import { CalendarDays, Filter } from "lucide-react";

const TIMEZONE = 'America/Mexico_City';

export default async function AdminBookingsPage() {
    const supabase = await createClient();
    const tenantId = await getTenantId();

    if (!tenantId) return redirect('/login');

    // Cargar citas futuras y recientes (últimas 24h para contexto)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: bookings } = await supabase
        .from("bookings")
        .select(`
            *, 
            services ( name, price, duration_min ),
            profiles:staff_id ( full_name, avatar_url )
        `)
        .eq("tenant_id", tenantId)
        .gte("start_time", yesterday.toISOString())
        .order("start_time", { ascending: true });

    // Datos para el botón flotante
    const { data: services } = await supabase
        .from("services")
        .select("id, name, duration_min")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

    const { data: staff } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("tenant_id", tenantId)
        .in("role", ["owner", "staff"])
        .eq("is_active_barber", true);

    // Agrupación por Fecha (Lógica de Presentación)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupedBookings: Record<string, PosBookingData[]> = {};

    (bookings as unknown as PosBookingData[])?.forEach((booking) => {
        const date = toZonedTime(booking.start_time, TIMEZONE);
        let key = format(date, 'EEEE d MMMM', { timeZone: TIMEZONE }); // "lunes 4 diciembre"

        if (isToday(date)) key = "Hoy";
        if (isTomorrow(date)) key = "Mañana";

        if (!groupedBookings[key]) groupedBookings[key] = [];
        groupedBookings[key]?.push(booking);
    });

    return (
        <div className="max-w-3xl mx-auto p-6 pb-32 min-h-screen">

            {/* Header Premium */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Agenda</h1>
                    <p className="text-gray-500 font-medium text-sm mt-1">Gestión de reservas.</p>
                </div>
                <div className="bg-white border border-gray-200 shadow-sm rounded-full px-4 py-2 flex items-center gap-2 text-xs font-bold text-gray-600">
                    <Filter size={14} />
                    <span>{bookings?.length || 0} Citas</span>
                </div>
            </div>

            {/* Lista Agrupada */}
            <div className="space-y-10">
                {Object.keys(groupedBookings).length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarDays className="text-gray-300" size={32} />
                        </div>
                        <p className="text-gray-400 font-medium">Agenda libre por ahora.</p>
                    </div>
                ) : (
                    Object.entries(groupedBookings).map(([dateLabel, items]) => (
                        <section key={dateLabel} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 sticky top-0 bg-gray-50 py-2 z-10 backdrop-blur-sm capitalize">
                                {dateLabel}
                            </h3>
                            <div className="space-y-3">
                                {items?.map((booking) => (
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    <BookingCard key={booking.id} booking={booking as any} />
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </div>

            <AddBookingButton
                tenantId={tenantId}
                services={services || []}
                staff={staff || []}
            />
        </div>
    );
}