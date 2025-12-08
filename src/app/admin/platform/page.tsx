import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TenantProvisioningForm from "@/components/admin/platform/TenantProvisioningForm";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default async function PlatformPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    // Validar Rol Super Admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'super_admin') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                    <ShieldAlert size={48} className="text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h1>
                <p className="text-gray-600 mb-8 max-w-md">
                    Esta área es exclusiva para la administración de la plataforma SaaS.
                    Si eres el dueño, por favor regresa a tu panel.
                </p>
                <Link
                    href="/admin"
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
                >
                    Volver al Dashboard
                </Link>
            </div>
        );
    }

    // Obtener lista de tenants para mostrar (MVP)
    const { data: tenants } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="min-h-screen bg-gray-50 p-6 pb-32">
            <div className="max-w-5xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Plataforma SaaS</h1>
                    <p className="text-gray-500">Panel de Control Maestro</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* COLUMNA IZQUIERDA: PROVISIONAMIENTO */}
                    <div className="lg:col-span-1">
                        <TenantProvisioningForm />
                    </div>

                    {/* COLUMNA DERECHA: LISTA DE NEGOCIOS */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="font-bold text-lg">Negocios Activos ({tenants?.length || 0})</h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {tenants?.map((tenant) => (
                                    <div key={tenant.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl font-bold text-gray-400 uppercase">
                                                {tenant.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">{tenant.name}</h3>
                                                <p className="text-xs text-gray-500 font-mono">/{tenant.slug}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                                Activo
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {(!tenants || tenants.length === 0) && (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        No hay negocios registrados aún.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
