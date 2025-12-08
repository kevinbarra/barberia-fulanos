import { createClient } from "@/utils/supabase/server";
import ScheduleManager from "@/components/admin/ScheduleManager";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

export default async function SchedulePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const params = await searchParams; // Next.js 15 requiere await en params

    // 1. Perfil y Permisos
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    const userRole = profile?.role || 'staff';
    const tenantId = profile?.tenant_id;

    // 2. Determinar a quién estamos viendo (Lógica de Owner)
    let targetStaffId = user.id; // Por defecto: Yo mismo

    // Si soy Owner/SuperAdmin Y hay un parámetro en la URL, cambio el objetivo
    const isManager = userRole === 'owner' || userRole === 'super_admin';

    if (isManager && params.view_staff && typeof params.view_staff === 'string') {
        targetStaffId = params.view_staff;
    }

    // 3. Cargar Horario Semanal del Objetivo
    const { data: schedules } = await supabase
        .from("staff_schedules")
        .select("*")
        .eq("staff_id", targetStaffId);

    // 4. Cargar Bloqueos
    // Si soy Manager, veo TODOS para tener contexto global en la lista inferior.
    // Si soy Staff, solo veo los míos.
    let blocksQuery = supabase
        .from("time_blocks")
        .select(`*, profiles:staff_id ( full_name )`)
        .gte("end_time", new Date().toISOString())
        .order("start_time", { ascending: true });

    if (isManager) {
        blocksQuery = blocksQuery.eq("tenant_id", tenantId);
    } else {
        blocksQuery = blocksQuery.eq("staff_id", user.id);
    }
    const { data: blocks } = await blocksQuery;

    // 5. Lista de Staff para el Dropdown (Solo Manager)
    let staffList: { id: string, full_name: string }[] = [];
    if (isManager) {
        const { data: staff } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('tenant_id', tenantId)
            .neq('role', 'customer');
        staffList = staff || [];
    }

    // Formatear Bloqueos
    const formattedBlocks = blocks?.map(b => ({
        id: b.id,
        start_time: b.start_time,
        end_time: b.end_time,
        reason: b.reason,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        staff_name: (b.profiles as any)?.full_name || 'Desconocido',
        staff_id: b.staff_id
    })) || [];

    return (
        <div className="max-w-5xl mx-auto p-6 pb-32">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-full transition-colors md:hidden">
                    <ChevronLeft size={24} className="text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Tiempo</h1>
                    <p className="text-gray-600 text-sm">
                        {(userRole === 'owner' || userRole === 'super_admin') ? 'Configura horarios globales.' : 'Configura tu disponibilidad.'}
                    </p>
                </div>
            </div>

            <ScheduleManager
                schedules={schedules || []}
                blocks={formattedBlocks}
                userRole={userRole}
                userId={user.id}
                targetStaffId={targetStaffId} // ID del staff que estamos viendo actualmente
                staffList={staffList}
            />
        </div>
    );
}