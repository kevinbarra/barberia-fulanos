import BottomNav from "@/components/ui/BottomNav";
import { createClient } from "@/utils/supabase/server";

export default async function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. Verificar permisos del usuario actual
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let isStaffOrOwner = false;

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        // Si es owner o staff, tiene permiso de ver el botón de Admin
        isStaffOrOwner = profile?.role === 'owner' || profile?.role === 'staff';
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            <main className="pb-24 md:pb-0">
                {children}
            </main>

            {/* Pasamos la prop de permiso al menú */}
            <BottomNav role="client" showAdminEntry={isStaffOrOwner} />
        </div>
    );
}