import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
    const supabase = await createClient();

    // 1. Verificar sesión
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    // 2. Obtener el slug de la barbería para el botón de compartir
    const { data: profile } = await supabase
        .from("profiles")
        .select("tenants (slug, name)")
        .eq("id", user.id)
        .single();

    // @ts-ignore
    const tenantName = profile?.tenants?.name || "Mi Negocio";
    // @ts-ignore
    const tenantSlug = profile?.tenants?.slug || "fulanos";

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* HEADER */}
            <div className="mb-8 mt-4">
                <h1 className="text-2xl font-bold text-gray-900">Hola, Kevin 👋</h1>
                <p className="text-gray-500 text-sm">Panel de Control - {tenantName}</p>
            </div>

            {/* GRID DE ACCIONES */}
            <div className="grid grid-cols-1 gap-4">

                {/* TARJETA 1: AGENDA (La más importante) */}
                <Link
                    href="/admin/bookings"
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl">
                            📅
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600">Agenda</h3>
                            <p className="text-gray-400 text-xs">Ver citas y cobrar</p>
                        </div>
                    </div>
                    <span className="text-gray-300 text-xl">→</span>
                </Link>

                {/* TARJETA 2: SERVICIOS */}
                <div className="grid grid-cols-2 gap-4">
                    <Link
                        href="/admin/services"
                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-black transition-all"
                    >
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-xl">
                            ✂️
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm">Servicios</h3>
                        <p className="text-gray-400 text-[10px]">Precios y duración</p>
                    </Link>

                    <Link
                        href="/admin/schedule"
                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-black transition-all"
                    >
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-xl">
                            ⏰
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm">Horarios</h3>
                        <p className="text-gray-400 text-[10px]">Tu disponibilidad</p>
                    </Link>
                </div>

                {/* TARJETA 3: MI LINK PÚBLICO */}
                <div className="mt-4 p-4 bg-black rounded-2xl text-white">
                    <h3 className="font-bold text-sm mb-1">Tu Link de Reservas</h3>
                    <p className="text-xs text-gray-400 mb-3 break-all">
                        https://barberia-fulanos.vercel.app/book/{tenantSlug}
                    </p>
                    <Link
                        href={`/book/${tenantSlug}`}
                        target="_blank"
                        className="block w-full bg-white text-black text-center py-2 rounded-lg text-sm font-bold hover:bg-gray-200"
                    >
                        Ver como Cliente 👁️
                    </Link>
                </div>

            </div>
        </div>
    );
}