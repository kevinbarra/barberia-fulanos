import BottomNav from "@/components/client/BottomNav";
import AutoRefreshWrapper from "@/components/admin/AutoRefreshWrapper";
import { checkAndClaimInvitations } from "@/lib/auth-helpers";
import { getUserTenantSlug } from "@/lib/tenant";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { shiftColorHue, hexToRgba } from "@/lib/colors";
import ClientBackground from "@/components/client/ClientBackground";

export default async function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Obtener rol para mostrar opciones de admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = profile?.role || 'customer';

    // Auto-vinculación (SELF-HEALING)
    await checkAndClaimInvitations();

    // ESTRATEGIA DE NAVEGACIÓN ROBUSTA:
    // 1. Intentar obtener slug del subdominio (Contexto actual)
    // 2. Si no hay subdominio (está en www), intentar obtener de su perfil (Contexto histórico)
    const { headers } = await import("next/headers");
    const headerList = await headers();
    const hostname = headerList.get("host") || "";

    let currentSlug = "";

    // Detectar subdominio
    if (hostname.includes(".agendabarber.pro") || hostname.includes(".localhost")) {
        const parts = hostname.split(".");
        if (parts.length >= 3) { // sub.domain.com
            const subdomain = parts[0];
            if (subdomain !== 'www' && subdomain !== 'app') {
                currentSlug = subdomain;
            }
        }
    }

    // Si no estamos en subdominio, usar el del perfil
    const userSlug = await getUserTenantSlug();
    const tenantSlug = currentSlug || userSlug || '';

    console.log('[LAYOUT DEBUG] Host:', hostname);
    console.log('[LAYOUT DEBUG] CurrentSlug (Subdomain):', currentSlug);
    console.log('[LAYOUT DEBUG] UserSlug (Profile):', userSlug);
    console.log('[LAYOUT DEBUG] Final TenantSlug:', tenantSlug);

    // Obtener color del tenant
    let brandColor = '#ea2707';
    if (tenantSlug) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('brand_color')
            .eq('slug', tenantSlug)
            .single();
        if (tenant?.brand_color) {
            brandColor = tenant.brand_color;
        }
    }

    const secondaryColor = shiftColorHue(brandColor, 40);
    const brandColor5 = hexToRgba(brandColor, 0.05);
    const brandColor10 = hexToRgba(brandColor, 0.10);
    const brandColor40 = hexToRgba(brandColor, 0.40);
    const secondaryColor20 = hexToRgba(secondaryColor, 0.20);

    return (
        <div 
            style={{
                '--brand-color': brandColor,
                '--brand-color-secondary': secondaryColor,
                '--brand-color-5': brandColor5,
                '--brand-color-10': brandColor10,
                '--brand-color-40': brandColor40,
                '--brand-color-secondary-20': secondaryColor20,
            } as React.CSSProperties}
            className="min-h-screen bg-zinc-950 relative overflow-hidden"
        >
            <style>{`
                html, body {
                    background-color: #09090b !important;
                }
            `}</style>
            <ClientBackground brandColor={brandColor} secondaryColor={secondaryColor} />
            <AutoRefreshWrapper />
            <main className="relative z-10 pb-24 md:pb-0">
                {children}
            </main>

            <BottomNav tenantSlug={tenantSlug} role={role} />
        </div>
    );
}