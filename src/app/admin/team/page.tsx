import { createClient, getTenantId } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TeamList from "@/components/admin/team/TeamList";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type StaffMember = {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: string;
    status: 'active' | 'pending';
}

export default async function TeamPage() {
    const supabase = await createClient();
    const tenantId = await getTenantId();

    if (!tenantId) return redirect("/login");

    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

    const currentUserRole = profile?.role || 'staff';

    // Get all profiles for this tenant
    const { data: activeStaff } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

    // Filter to team roles (exclude customers)
    const teamRoles = ['super_admin', 'owner', 'staff', 'kiosk'];
    const filteredStaff = activeStaff?.filter(s => teamRoles.includes(s.role)) || [];

    let pendingInvites: { id: string; email: string; created_at: string }[] = [];

    if (currentUserRole === 'owner' || currentUserRole === 'super_admin') {
        const { data: invites } = await supabase
            .from('staff_invitations')
            .select('id, email, created_at')
            .eq('tenant_id', tenantId)
            .eq('status', 'pending');

        if (invites) {
            pendingInvites = invites;
        }
    }

    const staffList: StaffMember[] = [
        ...filteredStaff.map(s => ({ ...s, status: 'active' as const })),
        ...(pendingInvites || []).map(inv => ({
            id: inv.id,
            full_name: 'Invitado',
            email: inv.email,
            avatar_url: null,
            role: 'staff',
            status: 'pending' as const
        }))
    ];

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
                            {currentUserRole === 'owner' || currentUserRole === 'super_admin' ? 'Gestiona el acceso y roles del equipo.' : 'Compañeros de trabajo.'}
                        </p>
                    </div>
                </div>
                <TeamList staff={staffList} currentUserRole={currentUserRole} />
            </div>
        </div>
    )
}