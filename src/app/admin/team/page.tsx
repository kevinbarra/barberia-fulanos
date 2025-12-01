import { createClient, getTenantId } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TeamList from "@/components/admin/team/TeamList";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function TeamPage() {
    const supabase = await createClient();
    const tenantId = await getTenantId();

    if (!tenantId) return redirect("/login");

    const { data: { user } } = await supabase.auth.getUser();

    // 1. Obtener perfil del usuario actual
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

    const currentUserRole = profile?.role || 'staff';

    // 2. Obtener Staff ACTIVO
    const { data: activeStaff } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

    // 3. Obtener Invitaciones (CORREGIDO CON TIPADO)
    // Definimos la estructura exacta para evitar el error "implicitly has any type"
    let pendingInvites: { id: string; email: string; created_at: string }[] = [];

    if (currentUserRole === 'owner') {
        const { data: invites } = await supabase
            .from('staff_invitations')
            .select('id, email, created_at')
            .eq('tenant_id', tenantId)
            .eq('status', 'pending');

        if (invites) {
            pendingInvites = invites;
        }
    }

    // 4. Unificar listas
    const staffList = [
        ...(activeStaff || []).map(s => ({ ...s, status: 'active' })),
        ...(pendingInvites || []).map(inv => ({
            id: inv.id,
            full_name: 'Invitado',
            email: inv.email,
            avatar_url: null,
            role: 'staff',
            status: 'pending'
        }))
    ] as any[];

    return (
        <div className="min-h-screen bg-gray-50 p-6 pb-32">
            <div className="max-w-2xl mx-auto">

                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ChevronLeft size={24} className="text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Equipo</h1>
                        <p className="text-gray-500 text-sm">
                            {currentUserRole === 'owner' ? 'Gestiona el acceso al negocio.' : 'Compañeros de trabajo.'}
                        </p>
                    </div>
                </div>

                <TeamList staff={staffList} currentUserRole={currentUserRole} />

            </div>
        </div>
    )
}