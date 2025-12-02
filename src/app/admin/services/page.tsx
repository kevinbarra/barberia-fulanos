import { createClient, getTenantId } from "@/utils/supabase/server";
import ServiceList from "@/components/admin/ServiceList";
import CreateServiceForm from "@/components/admin/CreateServiceForm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function ServicesPage() {
    const supabase = await createClient();
    const tenantId = await getTenantId();

    if (!tenantId) return redirect("/login");

    // Traer TODOS los servicios
    const { data: services } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("is_active", { ascending: false })
        .order("name", { ascending: true });

    return (
        <div className="max-w-5xl mx-auto p-6 pb-32">

            {/* Header con Navegación */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-full transition-colors md:hidden">
                    <ChevronLeft size={24} className="text-gray-600" />
                </Link>
                <div className="flex-1 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Catálogo</h1>
                        <p className="text-gray-500 text-sm">Gestiona tus precios y servicios.</p>
                    </div>
                    <span className="hidden sm:block bg-zinc-100 px-4 py-2 rounded-full text-sm font-bold text-zinc-600 border border-zinc-200">
                        {services?.length || 0} Servicios
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* COLUMNA IZQUIERDA: CREAR */}
                <div className="lg:col-span-1">
                    <CreateServiceForm tenantId={tenantId} />
                </div>

                {/* COLUMNA DERECHA: LISTA */}
                <div className="lg:col-span-2">
                    <ServiceList services={services || []} />
                </div>

            </div>
        </div>
    );
}