'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation' // Para cambiar URL
import { saveSchedule, addTimeBlock, deleteTimeBlock } from '@/app/admin/schedule/actions'
import { toast } from 'sonner'
import { Trash2, Calendar, Loader2, User, Users } from 'lucide-react'
import { toZonedTime, format } from 'date-fns-tz'

const TIMEZONE = 'America/Mexico_City';

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
    const [isSaving, setIsSaving] = useState(false)
    const [isAddingBlock, setIsAddingBlock] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)

    const getSchedule = (day: string) =>
        schedules?.find((s) => s.day === day) || { is_active: false, start_time: "10:00", end_time: "20:00" };

    // --- CAMBIAR DE USUARIO (OWNER) ---
    const handleStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        router.push(`/admin/schedule?view_staff=${newId}`); // Recarga la página con los datos del nuevo staff
        toast.loading("Cargando horario...", { duration: 1000 });
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* COLUMNA 1: SEMANA TIPO */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                        <h2 className="font-bold text-lg text-gray-900">Semana Tipo</h2>
                    </div>

                    {/* SELECTOR DE STAFF (SOLO OWNER) */}
                    {userRole === 'owner' && (
                        <div className="relative">
                            <select
                                value={targetStaffId}
                                onChange={handleStaffChange}
                                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold focus:ring-black focus:border-black appearance-none cursor-pointer hover:bg-gray-50 shadow-sm"
                            >
                                {staffList.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.full_name} {s.id === userId ? '(Tú)' : ''}
                                    </option>
                                ))}
                            </select>
                            <Users size={16} className="absolute left-3 top-2.5 text-gray-500 pointer-events-none" />
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative">
                    {/* Indicador visual de a quién estamos editando */}
                    {userRole === 'owner' && targetStaffId !== userId && (
                        <div className="absolute -top-3 right-6 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-3 py-1 rounded-full border border-yellow-200">
                            EDITANDO A: {staffList.find(s => s.id === targetStaffId)?.full_name.toUpperCase()}
                        </div>
                    )}

                    <form action={handleSaveWeekly}>
                        {/* Campo oculto vital para decirle al server a quién editar */}
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
                            <button type="submit" disabled={isSaving} className="bg-black text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2 ml-auto">
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

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar size={16} /> Agregar Tiempo Fuera
                    </h3>
                    <form ref={formRef} action={handleAddBlock} className="space-y-4">

                        {/* Selector para Bloqueos (Por defecto selecciona al staff que estás viendo) */}
                        {userRole === 'owner' && (
                            <div className="hidden">
                                {/* Lo ocultamos visualmente pero enviamos el ID del staff que estamos viendo en la columna 1 
                                    para mantener coherencia, o podrías poner otro selector explícito. 
                                    Por UX, asumimos que si estás viendo a Juan, quieres bloquear a Juan. */}
                                <input type="hidden" name="staff_id" value={targetStaffId} />
                            </div>
                        )}

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
                        <button type="submit" disabled={isAddingBlock} className="w-full bg-red-50 text-red-600 border border-red-100 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition-all flex justify-center items-center gap-2">
                            {isAddingBlock ? 'Procesando...' : '+ Bloquear Horario'}
                        </button>
                    </form>
                </div>

                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                        Próximos Bloqueos
                    </h3>
                    {!blocks || blocks.length === 0 ? (
                        <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400 text-xs">
                            No hay bloqueos futuros.
                        </div>
                    ) : (
                        blocks.map(block => {
                            const start = formatTime(block.start_time)
                            const end = formatTime(block.end_time)

                            return (
                                <div key={block.id} className="bg-white p-3 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm text-gray-900">{block.reason}</span>
                                            {userRole === 'owner' && block.staff_id !== userId && (
                                                <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold truncate max-w-[100px]">
                                                    {block.staff_name}
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