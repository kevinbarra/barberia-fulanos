import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { LayoutDashboard, Globe, Users, TrendingUp } from "lucide-react";

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

    // Fetch recent tenants
    const { data: recentTenants } = await supabase
        .from('tenants')
        .select('id, name, slug, created_at, subscription_status')
        .order('created_at', { ascending: false })
        .limit(5);

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

            {/* Recent Tenants */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                    <h3 className="font-bold text-gray-900">Negocios Recientes</h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {recentTenants?.map((tenant) => (
                        <div key={tenant.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-400 uppercase">
                                    {tenant.name[0]}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-gray-900 truncate">{tenant.name}</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">{tenant.slug}.agendabarber.pro</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                    tenant.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                }`}>
                                    {tenant.subscription_status}
                                </span>
                                <p className="text-xs text-gray-400 font-medium">{new Date(tenant.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
