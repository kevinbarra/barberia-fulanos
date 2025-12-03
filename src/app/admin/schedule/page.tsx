import { createClient } from "@/utils/supabase/server";
import ScheduleManager from "@/components/admin/ScheduleManager";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

export default async function SchedulePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    // 1. Obtener Rol del Usuario Actual
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    const userRole = profile?.role || 'staff';
    const tenantId = profile?.tenant_id;

    // 2. Cargar Horario Semanal (Solo el propio por ahora)
    const { data: schedules } = await supabase
        .from("staff_schedules")
        .select("*")
        .eq("staff_id", user.id);

    // 3. Cargar Bloqueos (Lógica Owner vs Staff)
    let query = supabase
        .from("time_blocks")
        .select(`
            *,
            profiles:staff_id ( full_name ) 
        `)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

    if (userRole === 'owner') {
        // Owner ve TODO el negocio
        query = query.eq("tenant_id", tenantId);
    } else {
        // Staff ve solo lo SUYO
        query = query.eq("staff_id", user.id);
    }

    const { data: blocks } = await query;

    // 4. Cargar Lista de Staff (Solo si es Owner, para el selector)
    let staffList: { id: string, full_name: string }[] = [];
    if (userRole === 'owner') {
        const { data: staff } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('tenant_id', tenantId)
            .neq('role', 'customer'); // Solo staff y owners

        staffList = staff || [];
    }

    // Formatear bloqueos para el cliente
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
                        {userRole === 'owner' ? 'Administra la disponibilidad de todo el equipo.' : 'Configura tu disponibilidad.'}
                    </p>
                </div>
            </div>

            <ScheduleManager
                schedules={schedules || []}
                blocks={formattedBlocks}
                userRole={userRole}
                userId={user.id}
                staffList={staffList}
            />

        </div>
    );
}