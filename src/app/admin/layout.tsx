import BottomNav from "@/components/ui/BottomNav";
import Sidebar from "@/components/ui/Sidebar";
import { createClient } from "@/utils/supabase/server";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Obtenemos el rol para pasarlo al Sidebar (Server Side para ser rápido)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let role: 'admin' | 'client' = 'admin'; // Default seguro
    let userRole = 'staff';

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        userRole = profile?.role || 'staff';
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-row">

            {/* A. SIDEBAR (Solo visible en Desktop 'md:flex') */}
            {/* Pasamos el rol específico para filtrar items internamente si es necesario */}
            {/* @ts-ignore - Simplificación de tipos para el MVP */}
            <Sidebar role={userRole} />

            {/* B. CONTENIDO PRINCIPAL */}
            <div className="flex-1 flex flex-col min-h-screen relative w-full">

                {/* Ajustamos padding-bottom solo en móvil (pb-24) para el BottomNav */}
                <main className="flex-1 pb-24 md:pb-8 w-full">
                    {children}
                </main>

                {/* C. BOTTOM NAV (Solo visible en Móvil) */}
                {/* El componente ya tiene lógica para ocultarse en desktop, 
                    pero lo renderizamos aquí para móviles */}
                <BottomNav role="admin" />
            </div>
        </div>
    );
}