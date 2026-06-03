import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TenantProvisioningForm from "@/components/admin/platform/TenantProvisioningForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewTenantPage() {
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
        return redirect("/admin");
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
            <div className="max-w-xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-zinc-800/60 pb-6">
                    <Link
                        href="/admin/platform"
                        className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 rounded-xl transition-colors text-zinc-300 hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Nueva Barbería</h1>
                        <p className="text-zinc-400 text-sm mt-0.5">Crear un nuevo negocio en la plataforma</p>
                    </div>
                </div>

                {/* Form */}
                <TenantProvisioningForm />
            </div>
        </div>
    );
}
