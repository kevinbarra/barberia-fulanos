"use client";

import { useState, useEffect, useMemo } from "react";
import { createBooking, getTakenRanges } from "@/app/book/[slug]/actions"; // Usa getTakenRanges
import { format, toZonedTime } from 'date-fns-tz';
import { Loader2, Calendar, Clock, Check, ChevronLeft, User, Mail, Phone } from "lucide-react";
import Image from 'next/image';

const TIMEZONE = 'America/Mexico_City';

// Tipos
type Service = { id: string; name: string; price: number; duration_min: number; tenant_id: string; category?: string };
type Staff = { id: string; full_name: string; role: string; avatar_url: string | null };
type Schedule = { staff_id: string; day: string; start_time: string; end_time: string };
type CurrentUser = { id: string; full_name: string; email: string; phone: string } | null;

export default function BookingWizard({
    services,
    staff,
    schedules,
    currentUser
}: {
    services: Service[];
    staff: Staff[];
    schedules: Schedule[];
    currentUser?: CurrentUser;
}) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [success, setSuccess] = useState(false);

    // Selección
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");

    // Anti-Colisión (Rangos)
    const [takenRanges, setTakenRanges] = useState<{ start: number, end: number }[]>([]);

    // Datos Cliente (Pre-llenado si existe usuario)
    const [clientData, setClientData] = useState({
        name: currentUser?.full_name || "",
        phone: currentUser?.phone || "",
        email: currentUser?.email || ""
    });

    // Cargar Slots
    useEffect(() => {
        let isMounted = true;
        async function fetchSlots() {
            if (selectedDate && selectedStaff) {
                setIsLoadingSlots(true);
                try {
                    const ranges = await getTakenRanges(selectedStaff.id, selectedDate);
                    if (isMounted) setTakenRanges(ranges);
                } catch (error) {
                    console.error(error);
                } finally {
                    if (isMounted) setIsLoadingSlots(false);
                }
            }
        }
        fetchSlots();
        return () => { isMounted = false; };
    }, [selectedDate, selectedStaff]);

    // Categorías
    const groupedServices = useMemo(() => {
        return services.reduce((acc, service) => {
            const cat = service.category || 'General';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
        }, {} as Record<string, Service[]>);
    }, [services]);
    const categoryOrder = ['Cortes', 'Barba', 'Cejas', 'Paquetes', 'Extras', 'General'];

    // Generador de Slots
    const slots = useMemo(() => {
        if (!selectedDate || !selectedStaff) return [];
        const dateObj = new Date(selectedDate + "T12:00:00");
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
        const workSchedule = schedules.find((s) => s.staff_id === selectedStaff?.id && s.day === dayName);

        if (!workSchedule) return [];

        const generatedSlots = [];
        const currentTime = new Date(`${selectedDate}T${workSchedule.start_time}`);
        const endTime = new Date(`${selectedDate}T${workSchedule.end_time}`);

        while (currentTime < endTime) {
            const slotStartMs = currentTime.getTime();
            const slotEndMs = slotStartMs + (selectedService?.duration_min || 30) * 60000;

            // Verificar colisión exacta de rango (No solo el punto de inicio)
            const isTaken = takenRanges.some(range => {
                // ¿Se superponen los rangos?
                return (slotStartMs < range.end && slotEndMs > range.start);
            });

            if (!isTaken) {
                const timeString = currentTime.toLocaleTimeString('es-MX', {
                    hour: '2-digit', minute: '2-digit', hour12: true
                });
                generatedSlots.push({ label: timeString, value: currentTime.toLocaleTimeString('en-US', { hour12: false }) });
            }
            currentTime.setMinutes(currentTime.getMinutes() + 30);
        }
        return generatedSlots;
    }, [selectedDate, selectedStaff, schedules, takenRanges, selectedService]);

    const handleBooking = async () => {
        if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return;
        setIsSubmitting(true);

        const dateTime = `${selectedDate}T${selectedTime}`; // Formato HH:MM:SS esperado por Date()

        const result = await createBooking({
            tenant_id: selectedService.tenant_id,
            service_id: selectedService.id,
            staff_id: selectedStaff.id,
            start_time: dateTime,
            duration_min: selectedService.duration_min,
            client_name: clientData.name,
            client_phone: clientData.phone,
            client_email: clientData.email,
            customer_id: currentUser?.id || null // <--- VINCULACIÓN
        });

        setIsSubmitting(false);
        if (result.success) setSuccess(true);
        else alert(result.error || "Error al reservar");
    };

    if (success) {
        return (
            <div className="text-center py-10 animate-in zoom-in duration-500 p-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-lg border-4 border-green-50">
                    <Check size={48} strokeWidth={4} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">¡Cita Confirmada!</h2>
                <p className="text-gray-500 mb-8">
                    Tu lugar está reservado para el<br />
                    <strong>{selectedDate}</strong> a las <strong>{selectedTime}</strong>.
                </p>
                <a href="/app" className="block w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-900 transition-all">
                    Ir a mis Citas
                </a>
            </div>
        );
    }

    // --- PASO 1: SERVICIOS (Diseño Mejorado) ---
    if (step === 1) {
        return (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 bg-gray-50 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Selecciona un servicio</h2>
                    <p className="text-xs text-gray-500">Elige el tratamiento que deseas.</p>
                </div>
                <div className="p-4 space-y-6 h-[400px] overflow-y-auto custom-scrollbar">
                    {categoryOrder.map(category => {
                        const items = groupedServices[category];
                        if (!items || items.length === 0) return null;
                        return (
                            <div key={category}>
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">{category}</h3>
                                <div className="space-y-2">
                                    {items.map((service) => (
                                        <button key={service.id} onClick={() => { setSelectedService(service); setStep(2); }} className="w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center hover:border-black hover:shadow-md transition-all group text-left active:scale-[0.98]">
                                            <div>
                                                <span className="font-bold text-gray-900 block text-sm group-hover:text-black">{service.name}</span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} /> {service.duration_min} min</span>
                                            </div>
                                            <div className="font-black text-gray-900 text-sm bg-gray-100 px-3 py-1 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">
                                                ${service.price}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
        );
    }

    // --- PASO 2: STAFF (Grid Visual) ---
    if (step === 2) {
        return (
            <section className="animate-in fade-in slide-in-from-right-8 duration-300">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <button onClick={() => setStep(1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20} /></button>
                    <h2 className="font-bold text-gray-900">¿Quién te atiende?</h2>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                    {staff.map((member) => (
                        <button key={member.id} onClick={() => { setSelectedStaff(member); setStep(3); }} className="bg-white p-4 rounded-2xl border-2 border-transparent shadow-sm ring-1 ring-gray-100 hover:border-black hover:ring-0 transition-all flex flex-col items-center justify-center text-center gap-3 active:scale-95">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 relative">
                                {member.avatar_url ? <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl">{member.full_name.charAt(0)}</div>}
                            </div>
                            <div>
                                <span className="font-bold text-gray-900 block text-sm">{member.full_name.split(' ')[0]}</span>
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{member.role === 'owner' ? 'Master' : 'Pro'}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </section>
        );
    }

    // --- PASO 3: FECHA Y HORA (Mejorado) ---
    if (step === 3) {
        return (
            <section className="animate-in fade-in slide-in-from-right-8 duration-300 flex flex-col h-full">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-white sticky top-0 z-10">
                    <button onClick={() => setStep(2)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20} /></button>
                    <h2 className="font-bold text-gray-900">Elige Horario</h2>
                </div>

                <div className="p-6 space-y-6">
                    {/* Input Fecha Nativo (Por ahora, en Sprint F haremos el Custom Calendar Strip) */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Fecha</label>
                        <input type="date" className="w-full p-4 border border-gray-200 bg-gray-50 rounded-xl font-bold text-gray-900 focus:ring-black focus:border-black outline-none appearance-none" min={new Date().toISOString().split('T')[0]} onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); }} />
                    </div>

                    {selectedDate ? (
                        isLoadingSlots ? (
                            <div className="flex flex-col items-center py-10 text-gray-400 gap-2">
                                <Loader2 className="animate-spin" />
                                <span className="text-xs">Buscando espacios...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {slots.length === 0 ? (
                                    <p className="col-span-3 text-center py-6 bg-gray-50 rounded-xl text-gray-500 text-sm border-2 border-dashed border-gray-200">
                                        No hay horarios disponibles.<br /><span className="text-xs">Intenta otro día.</span>
                                    </p>
                                ) : (
                                    slots.map((s: any) => (
                                        <button key={s.value} onClick={() => setSelectedTime(s.value)} className={`py-3 px-1 rounded-xl text-sm font-bold border-2 transition-all ${selectedTime === s.value ? "bg-black text-white border-black shadow-lg scale-105" : "bg-white text-gray-700 border-gray-100 hover:border-gray-300"}`}>
                                            {s.label}
                                        </button>
                                    ))
                                )}
                            </div>
                        )
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-4">Selecciona una fecha arriba.</p>
                    )}
                </div>

                {selectedTime && (
                    <div className="p-4 border-t border-gray-100 mt-auto bg-white">
                        <button onClick={() => setStep(4)} className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-gray-900 active:scale-95 transition-all">
                            Continuar
                        </button>
                    </div>
                )}
            </section>
        );
    }

    // --- PASO 4: CONFIRMACIÓN (Datos) ---
    if (step === 4) {
        return (
            <section className="animate-in fade-in slide-in-from-right-8 duration-300">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <button onClick={() => setStep(3)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20} /></button>
                    <h2 className="font-bold text-gray-900">Confirma tu Cita</h2>
                </div>

                <div className="p-6 space-y-6">
                    {/* Resumen */}
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                        <div className="flex justify-between font-bold text-gray-900">
                            <span>{selectedService?.name}</span>
                            <span>${selectedService?.price}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar size={14} /> {selectedDate} • {selectedTime}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <User size={14} /> {selectedStaff?.full_name}
                        </div>
                    </div>

                    {/* Formulario (Oculto/Readonly si hay usuario) */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tus Datos</h3>

                        <div className="relative">
                            <User size={18} className="absolute left-4 top-4 text-gray-400" />
                            <input
                                type="text"
                                value={clientData.name}
                                readOnly={!!currentUser} // Si hay usuario, es solo lectura
                                className={`w-full pl-12 p-4 border rounded-xl font-medium outline-none ${currentUser ? 'bg-gray-100 text-gray-500 border-transparent' : 'border-gray-200 focus:border-black'}`}
                                placeholder="Nombre completo"
                                onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                            />
                        </div>
                        <div className="relative">
                            <Phone size={18} className="absolute left-4 top-4 text-gray-400" />
                            <input
                                type="tel"
                                value={clientData.phone}
                                readOnly={!!currentUser}
                                className={`w-full pl-12 p-4 border rounded-xl font-medium outline-none ${currentUser ? 'bg-gray-100 text-gray-500 border-transparent' : 'border-gray-200 focus:border-black'}`}
                                placeholder="Teléfono"
                                onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                            />
                        </div>
                        {!currentUser && (
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-4 text-gray-400" />
                                <input
                                    type="email"
                                    className="w-full pl-12 p-4 border border-gray-200 rounded-xl font-medium focus:border-black outline-none"
                                    placeholder="Correo (Opcional)"
                                    onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    <button onClick={handleBooking} disabled={!clientData.name || !clientData.phone || isSubmitting} className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-900 disabled:opacity-50 flex justify-center items-center shadow-xl transition-all active:scale-95">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirmar Reserva"}
                    </button>
                </div>
            </section>
        );
    }

    return null;
}