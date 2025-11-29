import { createClient } from "@/utils/supabase/server";
import ProfileForm from "@/components/admin/ProfileForm";
import Link from "next/link";

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user?.id)
        .single();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-md mx-auto mb-6 flex items-center gap-2">
                <Link href="/admin" className="text-sm font-medium text-gray-500 hover:text-black">
                    ← Volver al Dashboard
                </Link>
            </div>

            <div className="max-w-md mx-auto text-center mb-8">
                <h1 className="text-3xl font-black text-gray-900">Tu Perfil</h1>
                <p className="text-gray-500">Personaliza cómo te ven tus clientes.</p>
            </div>

            <ProfileForm
                initialName={profile?.full_name || ''}
                initialAvatar={profile?.avatar_url}
            />
        </div>
    )
}