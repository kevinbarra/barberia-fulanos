import { createClient, getTenantId } from "@/utils/supabase/server"; // Usamos el helper centralizado
import { createService } from "./actions";
import { redirect } from "next/navigation";

export default async function ServicesPage() {
    const supabase = await createClient();

    // 1. Estandarización: Usar el helper único
    const tenantId = await getTenantId();
    if (!tenantId) return redirect("/login");

    // 2. Obtener servicios
    const { data: services } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId) // Filtro automático
        .order("created_at", { ascending: false });

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Mis Servicios</h1>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {services?.length || 0} Servicios activos
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* COLUMNA IZQUIERDA: FORMULARIO */}
                <div className="bg-white p-6 rounded-xl shadow border border-gray-100 h-fit">
                    <h2 className="text-xl font-semibold mb-4">Nuevo Servicio</h2>
                    <form action={createService} className="space-y-4">
                        {/* El input oculto recibe el ID dinámico */}
                        <input type="hidden" name="tenant_id" value={tenantId} />

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre</label>
                            <input
                                name="name"
                                type="text"
                                required
                                placeholder="Ej. Corte Clásico"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Precio ($)</label>
                                <input
                                    name="price"
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="250.00"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Duración (min)</label>
                                <input
                                    name="duration"
                                    type="number"
                                    required
                                    placeholder="30"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors font-medium"
                        >
                            Guardar Servicio
                        </button>
                    </form>
                </div>

                {/* COLUMNA DERECHA: LISTA */}
                <div className="space-y-4">
                    {!services || services.length === 0 ? (
                        <p className="text-gray-500 text-center py-10 bg-gray-50 rounded-lg border border-dashed">
                            No tienes servicios registrados aún.
                        </p>
                    ) : (
                        services.map((service) => (
                            <div
                                key={service.id}
                                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center hover:border-black transition-colors"
                            >
                                <div>
                                    <h3 className="font-bold text-lg">{service.name}</h3>
                                    <p className="text-sm text-gray-500">{service.duration_min} minutos</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-bold block">${service.price}</span>
                                    <span className="text-xs text-green-600 font-medium">Activo</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}