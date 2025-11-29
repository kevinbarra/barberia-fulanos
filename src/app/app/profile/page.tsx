import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ClientProfileForm from "@/components/client/ClientProfileForm";

export default async function ClientProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

    return (
        <ClientProfileForm
            initialName={profile?.full_name || ''}
            initialAvatar={profile?.avatar_url}
        />
    );
}