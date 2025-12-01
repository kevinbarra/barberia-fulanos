import { createClient, getTenantId } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PosInterface from "@/components/admin/pos/PosInterface";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function PosPage() {
    const supabase = await createClient();
    const tenantId = await getTenantId();

    if (!tenantId) return redirect("/login");

    // Cargar Barberos Activos
    const { data: staff } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("tenant_id", tenantId)
        .in("role", ["owner", "staff"]);

    // Cargar Servicios Activos
    const { data: services } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name", { ascending: true });

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">

            {/* Header Simplificado POS */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm text-gray-500 hover:text-black hover:scale-110 transition-all"
                        title="Salir del Modo Caja"
                    >
                        <ChevronLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Terminal de Venta</h1>
                        <p className="text-xs text-gray-500 font-medium">Fulanos Barber Club</p>
                    </div>
                </div>
                <div className="hidden md:block px-4 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 animate-pulse">
                    ● Sistema Online
                </div>
            </div>

            {/* Interfaz Interactiva */}
            <PosInterface
                staff={staff || []}
                services={services || []}
                tenantId={tenantId}
            />
        </div>
    );
}