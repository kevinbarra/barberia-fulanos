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
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        href="/admin/platform"
                        className="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Nueva Barbería</h1>
                        <p className="text-gray-500 text-sm">Crear un nuevo negocio en la plataforma</p>
                    </div>
                </div>

                {/* Form */}
                <TenantProvisioningForm />
            </div>
        </div>
    );
}
