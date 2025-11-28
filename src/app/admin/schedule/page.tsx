import { createClient } from "@/utils/supabase/server";
import { saveSchedule } from "./actions";

// Helper para traducir días
const DAY_LABELS: Record<string, string> = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo",
};

export default async function SchedulePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Cargar horarios existentes
    const { data: schedules } = await supabase
        .from("staff_schedules")
        .select("*")
        .eq("staff_id", user?.id);

    // Helper para buscar si un día ya tiene configuración guardada
    const getSchedule = (day: string) =>
        schedules?.find((s) => s.day === day) || { is_active: false, start_time: "10:00", end_time: "20:00" };

    return (
        <div className="max-w-3xl mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Mi Horario de Trabajo</h1>
                <p className="text-gray-600">Configura cuándo estás disponible para recibir citas.</p>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                <form action={saveSchedule}>
                    <div className="space-y-6">
                        {Object.entries(DAY_LABELS).map(([key, label]) => {
                            const schedule = getSchedule(key);
                            return (
                                <div key={key} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">

                                    {/* SWITCH ACTIVAR/DESACTIVAR */}
                                    <div className="flex items-center gap-4 w-1/3">
                                        <input
                                            type="checkbox"
                                            name={`${key}_active`}
                                            defaultChecked={schedule.is_active}
                                            className="h-5 w-5 rounded border-gray-300 text-black focus:ring-black"
                                            id={`check_${key}`}
                                        />
                                        <label htmlFor={`check_${key}`} className="font-medium text-gray-900 cursor-pointer">
                                            {label}
                                        </label>
                                    </div>

                                    {/* SELECTORES DE HORA */}
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <input
                                                type="time"
                                                name={`${key}_start`}
                                                defaultValue={schedule.start_time.slice(0, 5)} // Cortar segundos HH:MM
                                                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                                            />
                                        </div>
                                        <span className="text-gray-400">hasta</span>
                                        <div>
                                            <input
                                                type="time"
                                                name={`${key}_end`}
                                                defaultValue={schedule.end_time.slice(0, 5)}
                                                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                        <button
                            type="submit"
                            className="bg-black text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                        >
                            Guardar Horarios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}