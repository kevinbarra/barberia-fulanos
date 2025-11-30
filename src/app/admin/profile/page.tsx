import { createClient } from "@/utils/supabase/server";
import ProfileForm from "@/components/admin/ProfileForm";
import ProfileMenu from "@/components/admin/ProfileMenu"; // <--- IMPORTAR NUEVO
import Link from "next/link";

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, tenants(slug)') // <--- Traemos el slug para el link público
        .eq('id', user?.id)
        .single();

    // @ts-ignore
    const tenantSlug = profile?.tenants?.slug || 'fulanos';

    return (
        <div className="min-h-screen bg-gray-50 p-6 pb-32">
            {/* Header */}
            <div className="max-w-md mx-auto mb-6">
                <h1 className="text-3xl font-black text-gray-900">Ajustes</h1>
                <p className="text-gray-500">Gestiona tu cuenta y accesos.</p>
            </div>

            {/* Módulo 1: Datos Personales */}
            <ProfileForm
                initialName={profile?.full_name || ''}
                initialAvatar={profile?.avatar_url}
            />

            {/* Módulo 2: Navegación y Salida (NUEVO) */}
            <div className="max-w-md mx-auto">
                <ProfileMenu tenantSlug={tenantSlug} />
            </div>
        </div>
    )
}