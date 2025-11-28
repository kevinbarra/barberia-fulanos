"use client";

import { useState } from "react";
import { createBooking } from "@/app/book/[slug]/actions"; // Importamos la acción

type Service = { id: string; name: string; price: number; duration_min: number; tenant_id: string };
type Staff = { id: string; full_name: string; role: string };
type Schedule = { staff_id: string; day: string; start_time: string; end_time: string };

export default function BookingWizard({
    services,
    staff,
    schedules,
}: {
    services: Service[];
    staff: Staff[];
    schedules: Schedule[];
}) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Estados de la selección
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");

    // Estados del cliente (Guest)
    const [clientData, setClientData] = useState({ name: "", phone: "", email: "" });

    // --- LÓGICA DE HORARIOS ---
    const getAvailableSlots = () => {
        if (!selectedDate || !selectedStaff) return [];
        const dateObj = new Date(selectedDate + "T00:00:00");
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
        const workSchedule = schedules.find((s) => s.staff_id === selectedStaff.id && s.day === dayName);

        if (!workSchedule) return [];

        const slots = [];
        let currentTime = new Date(`2000-01-01T${workSchedule.start_time}`);
        const endTime = new Date(`2000-01-01T${workSchedule.end_time}`);

        while (currentTime < endTime) {
            const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            slots.push(timeString);
            currentTime.setMinutes(currentTime.getMinutes() + 30);
        }
        return slots;
    };

    const slots = getAvailableSlots();

    // --- FUNCIÓN FINAL: GUARDAR CITA ---
    const handleBooking = async () => {
        if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return;

        setIsSubmitting(true);

        // Construir la fecha completa ISO (YYYY-MM-DDTHH:MM:00)
        const dateTime = `${selectedDate}T${selectedTime}:00`;

        const result = await createBooking({
            tenant_id: selectedService.tenant_id,
            service_id: selectedService.id,
            staff_id: selectedStaff.id,
            start_time: dateTime,
            duration_min: selectedService.duration_min,
            client_name: clientData.name,
            client_phone: clientData.phone,
            client_email: clientData.email,
        });

        setIsSubmitting(false);

        if (result.success) {
            setSuccess(true); // Mostrar pantalla de éxito
        } else {
            alert("Hubo un error al reservar. Inténtalo de nuevo.");
        }
    };

    // --- PANTALLA DE ÉXITO ---
    if (success) {
        return (
            <div className="text-center py-10 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">🎉</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Cita Confirmada!</h2>
                <p className="text-gray-600 mb-6">Te esperamos el {selectedDate} a las {selectedTime}</p>
                <button onClick={() => window.location.reload()} className="text-black underline">
                    Volver al inicio
                </button>
            </div>
        );
    }

    // --- PASO 1: SERVICIO ---
    if (step === 1) {
        return (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">1. Selecciona un servicio</h2>
                <div className="space-y-3">
                    {services.map((service) => (
                        <button
                            key={service.id}
                            onClick={() => { setSelectedService(service); setStep(2); }}
                            className="w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center hover:border-black hover:ring-1 hover:ring-black transition-all group text-left"
                        >
                            <div>
                                <span className="font-semibold text-gray-900 block group-hover:text-black">{service.name}</span>
                                <span className="text-sm text-gray-500">{service.duration_min} min</span>
                            </div>
                            <div className="font-bold text-gray-900">${service.price}</div>
                        </button>
                    ))}
                </div>
            </section>
        );
    }

    // --- PASO 2: BARBERO ---
    if (step === 2) {
        return (
            <section className="animate-in fade-in slide-in-from-right-8 duration-300">
                <button onClick={() => setStep(1)} className="text-sm text-gray-500 mb-4 hover:underline">← Volver</button>
                <h2 className="text-lg font-semibold mb-2 text-gray-800">2. ¿Quién te atiende?</h2>
                <div className="grid grid-cols-2 gap-3">
                    {staff.map((member) => (
                        <button
                            key={member.id}
                            onClick={() => { setSelectedStaff(member); setStep(3); }}
                            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-black hover:ring-1 hover:ring-black transition-all text-left"
                        >
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold mb-2 text-sm">{member.full_name.charAt(0)}</div>
                            <span className="font-semibold text-gray-900 block truncate">{member.full_name}</span>
                            <span className="text-xs text-gray-500 capitalize">{member.role}</span>
                        </button>
                    ))}
                </div>
            </section>
        );
    }

    // --- PASO 3: FECHA Y HORA ---
    if (step === 3) {
        return (
            <section className="animate-in fade-in slide-in-from-right-8 duration-300">
                <button onClick={() => setStep(2)} className="text-sm text-gray-500 mb-4 hover:underline">← Volver</button>
                <h2 className="text-lg font-semibold mb-2 text-gray-800">3. Fecha y Hora</h2>
                <input
                    type="date"
                    className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:ring-black focus:border-black"
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); }}
                />
                {selectedDate && (
                    <div className="grid grid-cols-3 gap-2">
                        {slots.length === 0 ? <p className="col-span-3 text-red-500 text-sm">No disponible</p> : slots.map((time) => (
                            <button
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`py-2 px-1 rounded-lg text-sm font-medium border ${selectedTime === time ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200"}`}
                            >
                                {time}
                            </button>
                        ))}
                    </div>
                )}
                {selectedTime && (
                    <button onClick={() => setStep(4)} className="w-full mt-6 bg-black text-white py-3 rounded-xl font-bold">
                        Continuar
                    </button>
                )}
            </section>
        );
    }

    // --- PASO 4: DATOS DEL CLIENTE (NUEVO) ---
    if (step === 4) {
        return (
            <section className="animate-in fade-in slide-in-from-right-8 duration-300">
                <button onClick={() => setStep(3)} className="text-sm text-gray-500 mb-4 hover:underline">← Volver</button>
                <h2 className="text-lg font-semibold mb-2 text-gray-800">4. Tus Datos</h2>
                <p className="text-sm text-gray-500 mb-6">Para enviarte la confirmación.</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
                        <input
                            type="text"
                            required
                            className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                            placeholder="Ej. Juan Pérez"
                            onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Teléfono (WhatsApp)</label>
                        <input
                            type="tel"
                            required
                            className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                            placeholder="Ej. 55 1234 5678"
                            onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Correo (Opcional)</label>
                        <input
                            type="email"
                            className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                            placeholder="juan@gmail.com"
                            onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    onClick={handleBooking}
                    disabled={!clientData.name || !clientData.phone || isSubmitting}
                    className="w-full mt-8 bg-black text-white py-3 rounded-xl font-bold text-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                    {isSubmitting ? (
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                    ) : "Confirmar Reserva"}
                </button>
            </section>
        );
    }

    return null;
}