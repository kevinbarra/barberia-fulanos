import { createClient } from "@/utils/supabase/server";
import ScheduleManager from "@/components/admin/ScheduleManager";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

export default async function SchedulePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    // 1. Cargar Horario Semanal
    const { data: schedules } = await supabase
        .from("staff_schedules")
        .select("*")
        .eq("staff_id", user.id);

    // 2. Cargar Bloqueos Futuros
    const { data: blocks } = await supabase
        .from("time_blocks")
        .select("*")
        .eq("staff_id", user.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

    return (
        <div className="max-w-4xl mx-auto p-6 pb-32">

            {/* HEADER */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-full transition-colors md:hidden">
                    <ChevronLeft size={24} className="text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Mi Disponibilidad</h1>
                    <p className="text-gray-600 text-sm">Gestiona tu semana y excepciones.</p>
                </div>
            </div>

            {/* INTERFAZ INTERACTIVA (CLIENT COMPONENT) */}
            <ScheduleManager
                schedules={schedules || []}
                blocks={blocks || []}
            />

        </div>
    );
}