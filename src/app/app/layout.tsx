import BottomNav from "@/components/ui/BottomNav";
import { createClient } from "@/utils/supabase/server";
import { checkAndClaimInvitations } from "@/lib/auth-helpers"; // <--- IMPORTAR

export default async function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. EJECUTAR AUTO-VINCULACIÓN (SELF-HEALING)
    // Esto arregla silenciosamente cualquier perfil que tenga invitación pendiente
    await checkAndClaimInvitations();

    // 2. Verificar permisos para el menú
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let isStaffOrOwner = false;

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        isStaffOrOwner = profile?.role === 'owner' || profile?.role === 'staff';
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            <main className="pb-24 md:pb-0">
                {children}
            </main>

            <BottomNav role="client" showAdminEntry={isStaffOrOwner} />
        </div>
    );
}