import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getPlatformStats } from "../actions";
import { BarChart3, TrendingUp, Calendar, DollarSign, Building2, Globe } from "lucide-react";
import PlatformReportsClient from "@/components/admin/platform/PlatformReportsClient";

export default async function PlatformReportsPage() {
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

    // Fetch all tenants to calculate basic details
    const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, slug, created_at, subscription_status, plan');

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-zinc-950 text-zinc-100">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/60 pb-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                        <BarChart3 className="text-amber-500" size={32} />
                        Reportes de Plataforma
                    </h1>
                    <p className="text-zinc-400 font-medium text-sm mt-1">
                        Análisis financiero, volumen de reservas y comportamiento de suscripciones.
                    </p>
                </div>
            </header>

            {/* Client Component wrapping the reports logic and charts */}
            <PlatformReportsClient stats={stats} tenants={tenants || []} />
        </div>
    );
}
