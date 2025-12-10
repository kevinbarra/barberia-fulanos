import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TenantProvisioningForm from "@/components/admin/platform/TenantProvisioningForm";
import TenantListItem from "@/components/admin/platform/TenantListItem";
import Link from "next/link";
import { ShieldAlert, Building2, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { getPlatformStats } from "./actions";

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

    // Obtener stats y lista de tenants
    const stats = await getPlatformStats();
    const { data: tenants } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 pb-32">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Plataforma SaaS</h1>
                    <p className="text-gray-500 text-sm">Panel de Control Maestro</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{stats.totalTenants}</p>
                        <p className="text-xs text-gray-500 font-medium">Barberías</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{stats.activeTenants}</p>
                        <p className="text-xs text-gray-500 font-medium">Activas</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{stats.monthlyBookings}</p>
                        <p className="text-xs text-gray-500 font-medium">Citas/Mes</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-amber-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">${stats.monthlyRevenue.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 font-medium">Revenue/Mes</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Form - Full width on mobile, 1/3 on desktop */}
                    <div className="lg:col-span-1 order-2 lg:order-1">
                        <TenantProvisioningForm />
                    </div>

                    {/* Tenant List - 2/3 on desktop */}
                    <div className="lg:col-span-2 order-1 lg:order-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-gray-100">
                                <h2 className="font-bold text-lg">Negocios ({tenants?.length || 0})</h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {tenants?.map((tenant) => (
                                    <TenantListItem key={tenant.id} tenant={tenant} />
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
