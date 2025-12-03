import { createClient, getTenantId } from "@/utils/supabase/server";
import BookingCard from "@/components/admin/BookingCard";
import AddBookingButton from "@/components/admin/AddBookingButton";
import { redirect } from "next/navigation";

export default async function AdminBookingsPage() {
    const supabase = await createClient();
    const tenantId = await getTenantId();

    if (!tenantId) return redirect('/login');

    const { data: bookings } = await supabase
        .from("bookings")
        .select(`*, services ( name, price, duration_min )`)
        .eq("tenant_id", tenantId)
        .order("start_time", { ascending: true });

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

    return (
        <div className="max-w-5xl mx-auto p-8 pb-24">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Agenda de Citas</h1>
                    <p className="text-gray-500">Gestión de cobros y horarios.</p>
                </div>
                <div className="bg-black text-white px-4 py-2 rounded-full text-sm font-bold">
                    {bookings?.length || 0} Citas
                </div>
            </div>

            <div className="space-y-4">
                {!bookings || bookings.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">No hay citas programadas aún.</p>
                    </div>
                ) : (
                    bookings.map((booking) => (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        <BookingCard key={booking.id} booking={booking as any} />
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