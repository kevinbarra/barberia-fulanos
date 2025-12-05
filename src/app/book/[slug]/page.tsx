import { createClient } from "@/utils/supabase/server";
import BookingWizard from "@/components/booking/BookingWizard";
import { notFound } from "next/navigation";
import Image from "next/image";

export default async function BookingPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    // Next.js 15 requiere await en params
    const { slug } = await params;
    const supabase = await createClient();

    // 1. Obtener Datos del Negocio (Tenant)
    const { data: tenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .single();

    if (!tenant) return notFound();

    // 2. Obtener Servicios Activos
    const { data: services } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("name");

    // 3. Obtener Staff Activo (Que corta pelo)
    const { data: staff } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", tenant.id)
        .neq("role", "customer")
        .eq("is_active_barber", true);

    // 4. Obtener Horarios
    const { data: schedules } = await supabase
        .from("staff_schedules")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">

            {/* --- BRANDING HEADER (NUEVO) --- */}
            <div className="bg-white w-full max-w-md rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 text-center animate-in slide-in-from-top-4 duration-500">
                <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full mb-4 overflow-hidden relative border-4 border-white shadow-md">
                    {tenant.logo_url ? (
                        <Image
                            src={tenant.logo_url}
                            alt={tenant.name}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-black text-gray-300">
                            {tenant.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{tenant.name}</h1>
                <p className="text-sm text-gray-500 mt-1">Reserva tu cita en segundos.</p>
            </div>

            {/* --- WIZARD DE RESERVA --- */}
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <BookingWizard
                    services={services || []}
                    staff={staff || []}
                    schedules={schedules || []}
                />
            </div>

            <p className="mt-8 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Powered by Fulanos
            </p>
        </div>
    );
}