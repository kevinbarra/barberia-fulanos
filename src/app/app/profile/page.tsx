import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ClientProfileForm from "@/components/client/ClientProfileForm";

// Forzamos renderizado dinámico para que siempre muestre los cambios del nombre inmediatos
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    // Consulta explícita y completa
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, loyalty_points, created_at, tenant_id")
        .eq("id", user.id)
        .single();

    // Obtener nombre del negocio si existe
    let tenantName = "";
    if (profile?.tenant_id) {
        const { data: tenant } = await supabase
            .from("tenants")
            .select("name")
            .eq("id", profile.tenant_id)
            .single();
        tenantName = tenant?.name || "";
    }

    return (
        <ClientProfileForm
            initialName={profile?.full_name || ""}
            initialAvatar={profile?.avatar_url || null}
            email={user.email || ""}
            phone={profile?.phone || ""}
            loyaltyPoints={profile?.loyalty_points || 0}
            // Pasamos la fecha exacta de la BD
            memberSince={profile?.created_at || new Date().toISOString()}
            tenantName={tenantName}
        />
    );
}