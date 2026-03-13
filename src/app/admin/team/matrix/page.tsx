import { createClient, getTenantIdForAdmin } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SkillsMatrix from "@/components/admin/team/SkillsMatrix";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { isKioskModeActive } from "@/utils/kiosk-server";

export default async function MatrixPage() {
    const supabase = await createClient();
    const tenantId = await getTenantIdForAdmin();

    if (!tenantId) return redirect("/login");

    // SECURITY: Block access in kiosk mode
    if (await isKioskModeActive(tenantId)) {
        redirect('/admin');
    }

    const { data: activeStaff } = await supabase
        .from('profiles')
        .select(`
            id, full_name, email, avatar_url, role, phone, is_active_barber, is_calendar_visible,
            staff_category, role_alias,
            staff_skills(service_id)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

    const { data: services } = await supabase
        .from('services')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

    const { data: tenant } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', tenantId)
        .single();

    const businessType = (tenant?.settings as any)?.business_type || 'barber';

    // Terminology (Simplified for now, will be enhanced with provider later if needed)
    const staffLabel = businessType === 'barber' ? 'Barbero' : 'Personal';

    const staffList = (activeStaff || []).map(s => ({
        ...s,
        status: 'active' as const,
        skills: (s as any).staff_skills?.map((ss: any) => ss.service_id) || []
    }));

    return (
        <div className="min-h-screen bg-gray-50 p-6 pb-32 transition-all">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin/team" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ChevronLeft size={24} className="text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Matriz de Competencias</h1>
                        <p className="text-gray-500 text-sm">Gestiona quién puede realizar cada servicio.</p>
                    </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1">
                    <SkillsMatrix
                        staff={staffList as any}
                        services={services || []}
                        staffLabel={staffLabel}
                    />
                </div>
            </div>
        </div>
    )
}
