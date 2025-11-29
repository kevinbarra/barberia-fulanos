import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import BookingWizard from "@/components/booking/BookingWizard";

export default async function BookingPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const supabase = await createClient();

    // 1. Buscar Barbería
    const { data: tenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .single();

    if (!tenant) return notFound();

    // 2. Cargar Servicios
    const { data: services } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);

    // 3. Cargar Staff (AHORA CON FOTO)
    const { data: staff } = await supabase
        .from("profiles")
        .select("id, full_name, role, avatar_url") // <--- CAMBIO CLAVE AQUÍ
        .eq("tenant_id", tenant.id)
        .in("role", ["owner", "staff"]);

    // 4. Cargar Horarios de todos
    const { data: schedules } = await supabase
        .from("staff_schedules")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 py-4 text-center">
                    <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
                    <p className="text-xs text-gray-500">Reserva tu cita en línea</p>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-8">
                <BookingWizard
                    services={services || []}
                    staff={staff || []}
                    schedules={schedules || []}
                />
            </main>
        </div>
    );
}