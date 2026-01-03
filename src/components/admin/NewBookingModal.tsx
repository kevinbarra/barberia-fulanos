"use client";

import { useState } from "react";
import { createWalkIn } from "@/app/admin/bookings/actions";
import { Clock, Check } from "lucide-react";

type Service = { id: string; name: string; duration_min: number; price?: number | null };
type Staff = { id: string; full_name: string };

export default function NewBookingModal({
    tenantId,
    services,
    staff,
    onClose,
}: {
    tenantId: string;
    services: Service[];
    staff: Staff[];
    onClose: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

    // Calcular la fecha/hora actual ajustada a la zona horaria local para el input
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const defaultTime = now.toISOString().slice(0, 16);

    const handleSubmit = async (formData: FormData) => {
        if (!selectedServiceId) return;

        setIsSubmitting(true);
        formData.set('service_id', selectedServiceId);
        const result = await createWalkIn(formData);
        setIsSubmitting(false);

        if (result?.success) {
            onClose();
            window.location.reload();
        } else {
            alert("Error al guardar la cita");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in">
            <div className="bg-white w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-300 max-h-[90vh] flex flex-col">

                {/* HEADER */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                    <h3 className="font-bold text-lg">🏃‍♂️ Registro Rápido</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black text-2xl font-light">×</button>
                </div>

                {/* FORMULARIO - Scrollable */}
                <form action={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                    <input type="hidden" name="tenant_id" value={tenantId} />

                    {/* 1. SELECCIONAR SERVICIO - Rich Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Servicio</label>

                        {/* Container con scroll y altura máxima responsive */}
                        <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/50 p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                            {services.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setSelectedServiceId(s.id)}
                                    className={`
                                        w-full p-4 rounded-xl border-2 text-left transition-all
                                        flex justify-between items-center gap-4
                                        active:scale-[0.98]
                                        ${selectedServiceId === s.id
                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 shadow-sm'
                                            : 'border-transparent bg-white hover:border-gray-200 hover:shadow-sm'
                                        }
                                    `}
                                >
                                    {/* Lado Izquierdo: Nombre + Duración (fluido) */}
                                    <div className="flex-1 min-w-0">
                                        <span className="font-bold text-gray-900 block leading-tight">
                                            {s.name}
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                            <Clock size={12} />
                                            {s.duration_min} min
                                        </span>
                                    </div>

                                    {/* Lado Derecho: Precio + Check (rígido) */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="font-black text-gray-900 whitespace-nowrap">
                                            ${s.price ?? 0}
                                        </span>
                                        {selectedServiceId === s.id && (
                                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <Check size={12} className="text-white" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. SELECCIONAR BARBERO */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Barbero</label>
                        <select name="staff_id" className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:ring-black focus:border-black" required>
                            {staff.map(s => (
                                <option key={s.id} value={s.id}>{s.full_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3. HORA */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora de inicio</label>
                        <input
                            type="datetime-local"
                            name="start_time"
                            defaultValue={defaultTime}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-black focus:border-black"
                            required
                        />
                    </div>

                    {/* 4. CLIENTE (Opcional) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Cliente (Opcional)</label>
                        <input
                            type="text"
                            name="client_name"
                            placeholder="Ej. Cliente de gorra roja"
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-black focus:border-black"
                        />
                    </div>

                    {/* 5. EMAIL (Opcional) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Opcional)</label>
                        <input
                            type="email"
                            name="client_email"
                            placeholder="cliente@email.com"
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-black focus:border-black"
                        />
                        <p className="text-xs text-gray-400 mt-1">Si existe, se vinculará automáticamente</p>
                    </div>

                    {/* BOTÓN SUBMIT */}
                    <button
                        type="submit"
                        disabled={isSubmitting || !selectedServiceId}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-2 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Registrando..." : "Registrar Visita"}
                    </button>
                </form>

            </div>
        </div>
    );
}