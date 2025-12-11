import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ClientProfileForm from "@/components/client/ClientProfileForm";

export default async function ClientProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, email, phone, loyalty_points, created_at, tenants(name)')
        .eq('id', user.id)
        .single();

    const tenantData = profile?.tenants as unknown as { name: string } | null;

    return (
        <ClientProfileForm
            initialName={profile?.full_name || ''}
            initialAvatar={profile?.avatar_url}
            email={profile?.email || user.email || ''}
            phone={profile?.phone || ''}
            loyaltyPoints={profile?.loyalty_points || 0}
            memberSince={profile?.created_at || ''}
            tenantName={tenantData?.name}
        />
    );
}