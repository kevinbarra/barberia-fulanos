import BottomNav from "@/components/client/BottomNav";
import { redirect } from "next/navigation";
import { checkAndClaimInvitations } from "@/lib/auth-helpers";
import { getUserTenantSlug } from "@/lib/tenant";

export default async function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. EJECUTAR AUTO-VINCULACIÓN (SELF-HEALING)
    await checkAndClaimInvitations();

    // 2. Obtener slug del tenant para navegación dinámica
    const tenantSlug = await getUserTenantSlug();

    // Si el usuario no tiene tenant asociado, redirigir a login
    if (!tenantSlug) {
        return redirect("/login");
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            <main className="pb-24 md:pb-0">
                {children}
            </main>

            <BottomNav tenantSlug={tenantSlug} />
        </div>
    );
}