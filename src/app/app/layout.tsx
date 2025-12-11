import BottomNav from "@/components/client/BottomNav";
import { checkAndClaimInvitations } from "@/lib/auth-helpers";
import { getUserTenantSlug } from "@/lib/tenant";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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

    return (
        <div className="min-h-screen bg-zinc-950">
            <main className="pb-24 md:pb-0">
                {children}
            </main>

            <BottomNav tenantSlug={tenantSlug} role={role} />
        </div>
    );
}