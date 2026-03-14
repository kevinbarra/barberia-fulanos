import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { LayoutDashboard, Globe, Users, TrendingUp } from "lucide-react";
import PlatformTenantList from "@/components/admin/platform/PlatformTenantList";

export default async function PlatformPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'super_admin') {
        return redirect("/admin");
    }

    // Fetch platform stats
    const { count: tenantCount } = await supabase.from('tenants').select('*', { count: 'exact', head: true });
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: bookingCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true });

    // Fetch ALL tenants with settings
    const { data: allTenants } = await supabase
        .from('tenants')
        .select('id, name, slug, created_at, subscription_status, settings')
        .order('created_at', { ascending: false });

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header>
                <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Platform Control<span className="text-blue-600">.</span></h1>
                <p className="text-gray-500 font-medium">Panel de gestión global para Kevin.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Tenants</p>
                        <h4 className="text-3xl font-black text-gray-900">{tenantCount || 0}</h4>
                    </div>
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <Globe size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Usuarios</p>
                        <h4 className="text-3xl font-black text-gray-900">{userCount || 0}</h4>
                    </div>
                    <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
                        <Users size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Citas</p>
                        <h4 className="text-3xl font-black text-gray-900">{bookingCount || 0}</h4>
                    </div>
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <TrendingUp size={24} />
                    </div>
                </div>
            </div>

            {/* Tenant List with CRUD */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <PlatformTenantList tenants={allTenants || []} />
            </div>
        </div>
    )
}
