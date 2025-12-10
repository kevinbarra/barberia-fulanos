import { createClient } from "@/utils/supabase/server";
import ProfileForm from "@/components/admin/ProfileForm";
import ProfileMenu from "@/components/admin/ProfileMenu";

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, tenants(slug)')
        .eq('id', user?.id)
        .single();

    // Type-safe extraction of tenant slug (handle both array and object from Supabase)
    const tenantsData = profile?.tenants;
    const tenantSlug = Array.isArray(tenantsData)
        ? tenantsData[0]?.slug || ''
        : (tenantsData as { slug?: string } | undefined)?.slug || '';

    return (
        <div className="min-h-screen bg-gray-50 p-6 pb-32">
            <div className="max-w-md mx-auto mb-6">
                <h1 className="text-3xl font-black text-gray-900">Ajustes</h1>
                <p className="text-gray-500">Gestiona tu cuenta y accesos.</p>
            </div>
            <ProfileForm
                initialName={profile?.full_name || ''}
                initialAvatar={profile?.avatar_url}
            />
            <div className="max-w-md mx-auto">
                <ProfileMenu tenantSlug={tenantSlug} />
            </div>
        </div>
    )
}