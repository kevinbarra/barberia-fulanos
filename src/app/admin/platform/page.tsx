import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PlatformTenantList from "@/components/admin/platform/PlatformTenantList";
import { getPlatformStats } from "./actions";

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
    const stats = await getPlatformStats();

    // Fetch ALL tenants with settings, plan and trial info
    const { data: allTenants } = await supabase
        .from('tenants')
        .select('id, name, slug, created_at, subscription_status, settings, plan, trial_ends_at, brand_color, timezone, logo_url')
        .order('created_at', { ascending: false });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-zinc-950 text-zinc-100">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/60 pb-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
                        Platform Control<span className="text-amber-500">.</span>
                    </h1>
                    <p className="text-zinc-400 font-medium text-sm mt-1">Panel de gestión global para Kevin.</p>
                </div>
            </header>

            {/* Tenant List with dashboard stats, graph and CRUD */}
            <PlatformTenantList tenants={allTenants || []} stats={stats} />
        </div>
    )
}
