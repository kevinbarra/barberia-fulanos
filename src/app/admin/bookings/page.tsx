import { createClient, getTenantId } from "@/utils/supabase/server";
import BookingCard from "@/components/admin/BookingCard";
import { redirect } from "next/navigation";

export default async function AdminBookingsPage() {
    const supabase = await createClient();

    // 1. Obtener el ID dinámicamente (Refactorización)
    const tenantId = await getTenantId();

    if (!tenantId) {
        // Si no tiene negocio asignado, al login
        return redirect('/login');
    }

    // 2. Traer las citas USANDO EL ID DINÁMICO
    const { data: bookings } = await supabase
        .from("bookings")
        .select(`
      *,
      services ( name, price, duration_min )
    `)
        .eq("tenant_id", tenantId) // <--- ¡Ahora es dinámico!
        .order("start_time", { ascending: true });

    return (
        <div className="max-w-5xl mx-auto p-8">
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
                    /* Renderizamos el componente cliente para cada cita */
                    bookings.map((booking) => (
                        // @ts-ignore
                        <BookingCard key={booking.id} booking={booking} />
                    ))
                )}
            </div>
        </div>
    );
}