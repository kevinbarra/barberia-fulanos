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
type TimeBlock = {
    id: string;
    start_time: string;
    end_time: string;
    reason: string | null;
    staff_name: string;
    staff_id: string;
    is_recurrent?: boolean;
    recurrence_rule?: any;
}
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
    const [recurrenceFreq, setRecurrenceFreq] = useState<'daily' | 'weekly'>('weekly');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [isRecurrent, setIsRecurrent] = useState(false);
    const [noEndDate, setNoEndDate] = useState(true);
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
                setIsRecurrent(false)
                setSelectedDays([])
                router.refresh() // AUTO-REFRESH
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
            else {
                toast.success('Bloqueo eliminado')
                router.refresh() // AUTO-REFRESH
            }
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
                    <form
                        key={`schedule-form-${targetStaffId}`}
                        action={(formData) => {
                            // FORCE OVERRIDE: Ensure formData has the CURRENT targetStaffId
                            formData.set('target_staff_id', targetStaffId);
                            handleSaveWeekly(formData);
                        }}
                    >
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

                    <form
                        ref={formRef}
                        action={(formData) => {
                            // VALIDATION: Weekly requires at least one day
                            if (isRecurrent && recurrenceFreq === 'weekly' && selectedDays.length === 0) {
                                toast.error('Selecciona al menos un día para la repetición semanal');
                                return;
                            }

                            // FORCE OVERRIDE: Ensure formData has the CURRENT targetStaffId
                            formData.set('staff_id', targetStaffId);

                            // Construct recurrence rule if enabled
                            formData.set('is_recurrent', isRecurrent ? 'true' : 'false');
                            if (isRecurrent) {
                                const untilDate = noEndDate ? '2099-12-31' : formData.get('until');
                                formData.set('recurrence_rule', JSON.stringify({
                                    type: recurrenceFreq,
                                    until: untilDate,
                                    days: recurrenceFreq === 'weekly' ? selectedDays : []
                                }));
                            }

                            handleAddBlock(formData);
                        }}
                        className="space-y-4"
                    >
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

                        {/* RECURRENCE UI */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_recurrent"
                                    name="is_recurrent"
                                    value="true"
                                    checked={isRecurrent}
                                    onChange={(e) => setIsRecurrent(e.target.checked)}
                                    className="h-5 w-5 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                                />
                                <label htmlFor="is_recurrent" className="text-sm font-medium text-gray-900 cursor-pointer">Repetir este bloqueo</label>
                            </div>

                            {isRecurrent && (
                                <div className="grid grid-cols-1 gap-4 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-1">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Frecuencia</label>
                                            <select
                                                name="freq"
                                                value={recurrenceFreq}
                                                onChange={(e) => setRecurrenceFreq(e.target.value as any)}
                                                className="w-full mt-1 p-2 border rounded-lg text-xs bg-white font-bold"
                                            >
                                                <option value="weekly">Semanal</option>
                                                <option value="daily">Diario</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Repetir hasta</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="date"
                                                    name="until"
                                                    disabled={noEndDate}
                                                    required={!noEndDate}
                                                    defaultValue={noEndDate ? '' : undefined}
                                                    className="flex-1 p-2 border rounded-lg text-xs bg-white disabled:bg-gray-100 disabled:text-gray-400"
                                                />
                                                <div className="flex items-center gap-1 min-w-fit">
                                                    <input
                                                        type="checkbox"
                                                        id="no_end_date"
                                                        checked={noEndDate}
                                                        onChange={(e) => setNoEndDate(e.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                                                    />
                                                    <label htmlFor="no_end_date" className="text-[10px] font-bold text-gray-600 cursor-pointer">Sin fin</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {recurrenceFreq === 'weekly' && (
                                        <div className="pt-2 border-t border-gray-100">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Días de repetición</label>
                                            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                                {Object.entries(DAY_LABELS).map(([key, label]) => (
                                                    <div key={key} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id={`repeat_${key}`}
                                                            checked={selectedDays.includes(key)}
                                                            onChange={() => {
                                                                setSelectedDays(prev =>
                                                                    prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
                                                                )
                                                            }}
                                                            className="h-5 w-5 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                                                        />
                                                        <label htmlFor={`repeat_${key}`} className="text-sm font-medium text-gray-900 cursor-pointer">
                                                            {label}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isAddingBlock || isLoadingData}
                            className="w-full bg-red-50 text-red-600 border border-red-100 py-3 rounded-xl text-sm font-black hover:bg-red-100 transition-all flex justify-center items-center gap-2 uppercase tracking-widest active:scale-95"
                        >
                            {isAddingBlock ? 'Procesando...' : 'Bloquear Horario'}
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

                            // FORMATEO DE RECURRENCIA
                            let displayPattern = start.date;
                            if (block.is_recurrent && block.recurrence_rule) {
                                const rule = typeof block.recurrence_rule === 'string'
                                    ? JSON.parse(block.recurrence_rule)
                                    : block.recurrence_rule;

                                if (rule.type === 'daily') {
                                    displayPattern = 'Diario';
                                } else if (rule.type === 'weekly' && rule.days?.length > 0) {
                                    const days = rule.days.map((d: string) => DAY_LABELS[d]?.substring(0, 3)).join(', ');
                                    displayPattern = `Semanal (${days})`;
                                }
                            }

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
                                            {block.is_recurrent && (
                                                <span className="bg-blue-50 text-blue-600 text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">Recurrente</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 font-mono">
                                            <span className="font-bold text-gray-700">{displayPattern}</span> • {start.time} - {end.time}
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