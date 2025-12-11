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

    // Auto-vinculación (SELF-HEALING)
    await checkAndClaimInvitations();

    // Obtener slug del tenant para navegación dinámica
    // Puede ser null para clientes nuevos sin barbería asociada
    const tenantSlug = await getUserTenantSlug() || '';

    return (
        <div className="min-h-screen bg-zinc-950">
            <main className="pb-24 md:pb-0">
                {children}
            </main>

            <BottomNav tenantSlug={tenantSlug} />
        </div>
    );
}