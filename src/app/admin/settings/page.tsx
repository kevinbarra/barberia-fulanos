import { createClient, getTenantIdForAdmin } from "@/utils/supabase/server";
import TenantForm from "@/components/admin/TenantForm";
import KioskPinForm from "@/components/admin/KioskPinForm";
import KioskModeToggle from "@/components/admin/KioskModeToggle";
import GuestCheckoutToggle from "@/components/admin/GuestCheckoutToggle";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    // Get user role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
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

    // Get tenant ID (handles super_admin subdomain lookup)
    const tenantId = await getTenantIdForAdmin();
    if (!tenantId) return redirect("/login");

    // Fetch tenant data directly with kiosk_pin
    const { data: tenant } = await supabase
        .from('tenants')
        .select('name, slug, logo_url, kiosk_pin')
        .eq('id', tenantId)
        .single();

    const tenantData = tenant as { name: string; slug: string; logo_url: string | null; kiosk_pin: string | null } | null;

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

                {/* Guest Checkout Toggle - NEW */}
                <GuestCheckoutToggle />

                {/* Modo Kiosko - Activar/Desactivar */}
                <KioskModeToggle />

                {/* Configuración PIN Kiosko */}
                <KioskPinForm initialPin={tenantData?.kiosk_pin || null} />
            </div>
        </div>
    )
}