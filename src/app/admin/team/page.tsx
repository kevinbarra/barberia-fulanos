import { createClient, getTenantIdForAdmin } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TeamList from "@/components/admin/team/TeamList";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { isKioskModeActive } from "@/utils/kiosk-server";

type StaffMember = {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: string;
    phone: string | null;
    status: 'active' | 'pending';
    is_active_barber: boolean;
    is_calendar_visible: boolean;
}

export default async function TeamPage() {
    const supabase = await createClient();
    const tenantId = await getTenantIdForAdmin();

    if (!tenantId) return redirect("/login");

    // SECURITY: Block access in kiosk mode
    if (await isKioskModeActive(tenantId)) {
        redirect('/admin');
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

    const currentUserRole = profile?.role || 'staff';

    // Get all profiles for this tenant (including staff_services join)
    const { data: activeStaff } = await supabase
        .from('profiles')
        .select(`
            id, full_name, email, avatar_url, role, phone, is_active_barber, is_calendar_visible,
            staff_services(service_id)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

    // Fetch services for specialty mapping
    const { data: services } = await supabase
        .from('services')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

    // Fetch business_type from tenant settings
    const { data: tenant } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', tenantId)
        .single();

    const businessType = (tenant?.settings as any)?.business_type || 'barber';

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
        ...filteredStaff.map(s => ({
            ...s,
            status: 'active' as const,
            services: (s as any).staff_services?.map((ss: any) => ss.service_id) || []
        })),
        ...(pendingInvites || []).map(inv => ({
            id: inv.id,
            full_name: 'Invitado',
            email: inv.email,
            avatar_url: null,
            role: 'staff',
            phone: null,
            status: 'pending' as const,
            is_active_barber: false,
            is_calendar_visible: false,
            services: []
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
                <TeamList
                    staff={staffList as any}
                    currentUserRole={currentUserRole}
                    services={services || []}
                    businessType={businessType}
                />
            </div>
        </div>
    )
}