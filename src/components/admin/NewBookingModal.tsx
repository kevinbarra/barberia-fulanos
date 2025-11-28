"use client";

import { useState } from "react";
import { createWalkIn } from "@/app/admin/bookings/actions";

type Service = { id: string; name: string; duration_min: number };
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

    // Calcular la fecha/hora actual ajustada a la zona horaria local para el input
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const defaultTime = now.toISOString().slice(0, 16);

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        const result = await createWalkIn(formData);
        setIsSubmitting(false);

        if (result?.success) {
            onClose();
            // Recargar para ver la cita inmediatamente
            window.location.reload();
        } else {
            alert("Error al guardar la cita");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in">
            <div className="bg-white w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-300">

                {/* HEADER */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">🏃‍♂️ Registro Rápido</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black text-2xl font-light">×</button>
                </div>

                {/* FORMULARIO */}
                <form action={handleSubmit} className="p-6 space-y-5">
                    <input type="hidden" name="tenant_id" value={tenantId} />

                    {/* 1. SELECCIONAR SERVICIO */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Servicio</label>
                        <select name="service_id" className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:ring-black focus:border-black" required>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.duration_min} min)</option>
                            ))}
                        </select>
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

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-2 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
                    >
                        {isSubmitting ? "Registrando..." : "Registrar Visita"}
                    </button>
                </form>

            </div>
        </div>
    );
}