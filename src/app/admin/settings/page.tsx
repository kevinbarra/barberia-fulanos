import { createClient } from "@/utils/supabase/server";
import TenantForm from "@/components/admin/TenantForm";
import KioskPinForm from "@/components/admin/KioskPinForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    // Validar que sea Owner
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id, tenants(*)')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'owner' && profile?.role !== 'super_admin') {
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold text-red-500">Acceso Restringido</h1>
                <p className="text-gray-500">Solo el dueño puede ver esta página.</p>
                <Link href="/admin" className="text-blue-600 underline mt-4 block">Volver</Link>
            </div>
        )
    }

    // Get tenant data including kiosk_pin
    const tenantData = profile?.tenants as unknown as { name: string; slug: string; logo_url: string | null; kiosk_pin: string | null } | undefined;

    return (
        <div className="max-w-4xl mx-auto p-6 pb-32">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-full transition-colors md:hidden">
                    <ChevronLeft size={24} className="text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
                    <p className="text-gray-600 text-sm">Personaliza la identidad de tu negocio.</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Formulario del Negocio */}
                {tenantData && (
                    <TenantForm initialData={tenantData} />
                )}

                {/* Configuración Modo Kiosko */}
                <KioskPinForm initialPin={tenantData?.kiosk_pin || null} />
            </div>
        </div>
    )
}