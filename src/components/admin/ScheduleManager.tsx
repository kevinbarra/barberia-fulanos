'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveSchedule, addTimeBlock, deleteTimeBlock } from '@/app/admin/schedule/actions'
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { toast } from 'sonner'
import { Trash2, Calendar, Loader2, User, Users, Lock } from 'lucide-react'
import { toZonedTime, format } from 'date-fns-tz'

const TIMEZONE = DEFAULT_TIMEZONE;

// TIPOS
type Schedule = { day: string; start_time: string; end_time: string; is_active: boolean | null }
type TimeBlock = { id: string; start_time: string; end_time: string; reason: string | null; staff_name: string; staff_id: string }
type StaffOption = { id: string; full_name: string }

const DAY_LABELS: Record<string, string> = {
    monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles",
    thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo",
};

export default function ScheduleManager({
    schedules,
    blocks,
    userRole,
    userId,
    targetStaffId,
    staffList
}: {
    schedules: Schedule[],
    blocks: TimeBlock[],
    userRole: string,
    userId: string,
    targetStaffId: string,
    staffList: StaffOption[]
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition();

    const [isSaving, setIsSaving] = useState(false)
    const [isAddingBlock, setIsAddingBlock] = useState(false)
    const [scheduleKey, setScheduleKey] = useState(targetStaffId);
    const formRef = useRef<HTMLFormElement>(null)

    // Forzar re-render del formulario cuando cambia el staff
    useEffect(() => {
        setScheduleKey(targetStaffId);
    }, [targetStaffId]);

    const getSchedule = (day: string) =>
        schedules?.find((s) => s.day === day) || { is_active: false, start_time: "10:00", end_time: "20:00" };

    // --- CAMBIO DE CONTEXTO GLOBAL ---
    const handleStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        startTransition(() => {
            router.push(`/admin/schedule?view_staff=${newId}`);
            router.refresh();
        });
    }

    // --- ACCIONES ---
    const handleSaveWeekly = async (formData: FormData) => {
        setIsSaving(true)
        try {
            const res = await saveSchedule(formData)
            if (res?.error) toast.error(res.error)
            else toast.success(res?.message || 'Horario guardado')
        } catch (e) {
            toast.error('Error de conexión')
        } finally {
            setIsSaving(false)
        }
    }

    const handleAddBlock = async (formData: FormData) => {
        setIsAddingBlock(true)
        try {
            const res = await addTimeBlock(formData)
            if (res?.error) toast.error(res.error)
            else {
                toast.success(res?.message || 'Bloqueo agregado')
                formRef.current?.reset()
            }
        } catch (e) {
            toast.error('Error al crear bloqueo')
        } finally {
            setIsAddingBlock(false)
        }
    }

    const handleDeleteBlock = async (id: string) => {
        if (!confirm('¿Eliminar este bloqueo?')) return;
        try {
            const res = await deleteTimeBlock(id)
            if (res?.error) toast.error(res.error)
            else toast.success('Bloqueo eliminado')
        } catch (e) {
            toast.error('Error al eliminar')
        }
    }

    const formatTime = (isoString: string) => {
        const zonedDate = toZonedTime(isoString, TIMEZONE)
        return {
            date: format(zonedDate, 'dd/MM/yyyy', { timeZone: TIMEZONE }),
            time: format(zonedDate, 'h:mm a', { timeZone: TIMEZONE })
        }
    }

    // Nombre del staff actual (para feedback visual)
    const currentStaffName = staffList.find(s => s.id === targetStaffId)?.full_name || 'Mí mismo';
    const isLoadingData = isPending;

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${isLoadingData ? 'opacity-50 pointer-events-none' : ''}`}>

            {/* COLUMNA 1: SEMANA TIPO */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                        <h2 className="font-bold text-lg text-gray-900">Semana Tipo</h2>
                    </div>

                    {/* SELECTOR MAESTRO (Controla toda la página) */}
                    {(userRole === 'owner' || userRole === 'super_admin') && (
                        <div className="relative">
                            <select
                                value={targetStaffId}
                                onChange={handleStaffChange}
                                disabled={isLoadingData}
                                className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold focus:ring-black focus:border-black appearance-none cursor-pointer hover:bg-gray-50 shadow-sm disabled:bg-gray-100 transition-all"
                            >
                                {staffList.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.full_name} {s.id === userId ? '(Tú)' : ''}
                                    </option>
                                ))}
                            </select>
                            <Users size={16} className="absolute left-3 top-2.5 text-gray-500 pointer-events-none" />
                            {isLoadingData && <div className="absolute right-3 top-2.5"><Loader2 size={16} className="animate-spin text-black" /></div>}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative">
                    <form key={scheduleKey} action={handleSaveWeekly}>
                        <input type="hidden" name="target_staff_id" value={targetStaffId} />

                        <div className="space-y-5">
                            {Object.entries(DAY_LABELS).map(([key, label]) => {
                                const schedule = getSchedule(key);
                                return (
                                    <div key={key} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name={`${key}_active`} defaultChecked={schedule.is_active || false} className="h-5 w-5 rounded border-gray-300 text-black focus:ring-black accent-black" id={`check_${key}`} />
                                            <label htmlFor={`check_${key}`} className="font-medium text-sm text-gray-900 w-20 cursor-pointer">{label}</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="time" name={`${key}_start`} defaultValue={schedule.start_time.slice(0, 5)} className="p-1 border rounded text-sm w-24 text-center bg-gray-50" />
                                            <span className="text-xs text-gray-400">-</span>
                                            <input type="time" name={`${key}_end`} defaultValue={schedule.end_time.slice(0, 5)} className="p-1 border rounded text-sm w-24 text-center bg-gray-50" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-100 text-right">
                            <button type="submit" disabled={isSaving || isLoadingData} className="bg-black text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2 ml-auto">
                                {isSaving && <Loader2 className="animate-spin w-4 h-4" />} Guardar Semana
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            {/* COLUMNA 2: EXCEPCIONES */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                    <h2 className="font-bold text-lg text-gray-900">Bloqueos</h2>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 relative">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar size={16} /> Agregar Tiempo Fuera
                    </h3>

                    {/* Feedback Visual de Contexto */}
                    {(userRole === 'owner' || userRole === 'super_admin') && targetStaffId !== userId && (
                        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-xs text-yellow-800">
                            <Lock size={14} />
                            <span>Creando bloqueo para: <strong>{currentStaffName}</strong></span>
                        </div>
                    )}

                    <form ref={formRef} action={handleAddBlock} className="space-y-4">

                        {/* CAMPO OCULTO MAESTRO: Obedece al targetStaffId global */}
                        <input type="hidden" name="staff_id" value={targetStaffId} />

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Día</label>
                            <input type="date" name="date" required className="w-full mt-1 p-2 border rounded-lg text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Desde</label>
                                <input type="time" name="start_time" required className="w-full mt-1 p-2 border rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Hasta</label>
                                <input type="time" name="end_time" required className="w-full mt-1 p-2 border rounded-lg text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Motivo</label>
                            <input type="text" name="reason" placeholder="Ej. Comida, Médico..." required className="w-full mt-1 p-2 border rounded-lg text-sm" />
                        </div>
                        <button type="submit" disabled={isAddingBlock || isLoadingData} className="w-full bg-red-50 text-red-600 border border-red-100 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition-all flex justify-center items-center gap-2">
                            {isAddingBlock ? 'Procesando...' : '+ Bloquear Horario'}
                        </button>
                    </form>
                </div>

                <div className="space-y-3 relative">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                        Próximos Bloqueos
                    </h3>
                    {!blocks || blocks.length === 0 ? (
                        <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400 text-xs">
                            No hay bloqueos futuros para {currentStaffName}.
                        </div>
                    ) : (
                        blocks.map(block => {
                            const start = formatTime(block.start_time)
                            const end = formatTime(block.end_time)
                            const isOwnBlock = block.staff_id === userId;

                            return (
                                <div key={block.id} className={`p-3 rounded-xl border flex justify-between items-center shadow-sm ${block.staff_id === targetStaffId ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm text-gray-900">{block.reason}</span>
                                            {/* Si estamos viendo "Mis Horarios" pero aparece un bloqueo de otro, lo etiquetamos */}
                                            {(userRole === 'owner' || userRole === 'super_admin') && (
                                                <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold truncate max-w-[100px]">
                                                    {isOwnBlock ? 'Tú' : block.staff_name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 font-mono">
                                            {start.date} • {start.time} - {end.time}
                                        </p>
                                    </div>
                                    <button onClick={() => handleDeleteBlock(block.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>
            </section>
        </div>
    )
}