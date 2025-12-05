"use client";

import { useState, useEffect, useMemo } from "react";
import { createBooking, getTakenRanges } from "@/app/book/[slug]/actions";
import { Loader2, Calendar, Clock, Check, ChevronLeft, User, Mail, Phone, ChevronRight, Sparkles } from "lucide-react";
import Image from 'next/image';

const TIMEZONE = 'America/Mexico_City';

// TIPOS
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

    // Datos Cliente (Pre-llenado inteligente)
    const [clientData, setClientData] = useState({
        name: currentUser?.full_name || "",
        phone: currentUser?.phone || "", // Si viene vacío, el usuario podrá escribir
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
            const cat = service.category || 'Servicios';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
        }, {} as Record<string, Service[]>);
    }, [services]);

    // Orden de categorías (Personalizable)
    const categoryOrder = Object.keys(groupedServices).sort();

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

            const isTaken = takenRanges.some(range => {
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

        const dateTime = `${selectedDate}T${selectedTime}`;

        const result = await createBooking({
            tenant_id: selectedService.tenant_id,
            service_id: selectedService.id,
            staff_id: selectedStaff.id,
            start_time: dateTime,
            duration_min: selectedService.duration_min,
            client_name: clientData.name,
            client_phone: clientData.phone,
            client_email: clientData.email,
            customer_id: currentUser?.id || null
        });

        setIsSubmitting(false);
        if (result.success) setSuccess(true);
        else alert(result.error || "Error al reservar");
    };

    if (success) {
        return (
            <div className="text-center py-12 px-6 animate-in zoom-in duration-500 flex flex-col items-center h-full justify-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-xl ring-8 ring-green-50">
                    <Check size={48} strokeWidth={4} className="text-green-600" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">¡Confirmado!</h2>
                <p className="text-gray-500 mb-8 max-w-[250px] mx-auto leading-relaxed">
                    Tu cita para el <strong>{selectedDate}</strong> a las <strong>{selectedTime}</strong> está lista.
                </p>
                <a href="/app" className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-900 transition-all shadow-lg hover:shadow-xl active:scale-95">
                    Ir a mis Citas
                </a>
            </div>
        );
    }

    // --- PASO 1: SERVICIOS (DISEÑO PREMIUM) ---
    if (step === 1) {
        return (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full bg-gray-50">
                <div className="p-6 bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Elige tu experiencia</h2>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Servicios disponibles</p>
                </div>

                <div className="p-4 space-y-8 overflow-y-auto custom-scrollbar flex-1 pb-20">
                    {categoryOrder.map(category => {
                        const items = groupedServices[category];
                        if (!items || items.length === 0) return null;
                        return (
                            <div key={category}>
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <Sparkles size={12} className="text-blue-500" />
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{category}</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {items.map((service) => (
                                        <button
                                            key={service.id}
                                            onClick={() => { setSelectedService(service); setStep(2); }}
                                            className="group relative w-full bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-black/10 transition-all text-left active:scale-[0.99] overflow-hidden"
                                        >
                                            <div className="flex justify-between items-start relative z-10">
                                                <div>
                                                    <span className="font-bold text-gray-900 text-base block group-hover:text-black transition-colors">{service.name}</span>
                                                    <span className="text-xs text-gray-400 font-medium mt-1 flex items-center gap-1">
                                                        <Clock size={10} /> {service.duration_min} min
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-gray-900 text-base bg-gray-50 px-3 py-1.5 rounded-xl group-hover:bg-black group-hover:text-white transition-colors">
                                                        ${service.price}
                                                    </span>
                                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-black transition-colors" />
                                                </div>
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

    // --- PASO 2: STAFF (GRID VISUAL) ---
    if (step === 2) {
        return (
            <section className="animate-in fade-in slide-in-from-right-8 duration-300 h-full flex flex-col bg-gray-50">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-white sticky top-0 z-10">
                    <button onClick={() => setStep(1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                    <h2 className="font-bold text-gray-900">¿Quién te atiende?</h2>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto">
                    {staff.map((member) => (
                        <button key={member.id} onClick={() => { setSelectedStaff(member); setStep(3); }} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-black hover:shadow-md transition-all text-left group flex flex-col items-center justify-center text-center gap-3 active:scale-95 aspect-square">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 relative ring-4 ring-gray-50 group-hover:ring-gray-200 transition-all">
                                {member.avatar_url ? <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl bg-gray-200">{member.full_name.charAt(0)}</div>}
                            </div>
                            <div>
                                <span className="font-bold text-gray-900 block text-sm">{member.full_name.split(' ')[0]}</span>
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{member.role === 'owner' ? 'Master' : 'Pro'}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </section>
        );
    }

    // --- PASO 3: FECHA Y HORA (STRIP CALENDAR) ---
    if (step === 3) {
        return (
            <section className="animate-in fade-in slide-in-from-right-8 duration-300 flex flex-col h-full bg-gray-50">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-white sticky top-0 z-10">
                    <button onClick={() => setStep(2)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20} /></button>
                    <h2 className="font-bold text-gray-900">Elige Horario</h2>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Fecha Nativa (Por ahora funcional, en Sprint G hacemos Custom Strip) */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-widest">Fecha</label>
                        <input type="date" className="w-full text-lg font-bold text-gray-900 outline-none bg-transparent" min={new Date().toISOString().split('T')[0]} onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); }} />
                    </div>

                    {selectedDate ? (
                        isLoadingSlots ? (
                            <div className="flex flex-col items-center py-12 text-gray-400 gap-3">
                                <Loader2 className="animate-spin text-black" size={32} />
                                <span className="text-xs font-medium">Buscando disponibilidad...</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Horas Disponibles</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {slots.length === 0 ? (
                                        <p className="col-span-3 text-center py-8 bg-white rounded-xl text-gray-400 text-sm border-2 border-dashed border-gray-200">
                                            Sin disponibilidad.<br /><span className="text-xs">Intenta otro día.</span>
                                        </p>
                                    ) : (
                                        slots.map((s: any) => (
                                            <button
                                                key={s.value}
                                                onClick={() => setSelectedTime(s.value)}
                                                className={`py-3 px-1 rounded-xl text-sm font-bold border transition-all ${selectedTime === s.value ? "bg-black text-white border-black shadow-lg scale-105" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                                            >
                                                {s.label}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="text-center py-10 text-gray-400 text-sm">
                            <Calendar size={48} className="mx-auto mb-3 text-gray-300" />
                            Selecciona una fecha arriba.
                        </div>
                    )}
                </div>

                {selectedTime && (
                    <div className="p-4 border-t border-gray-200 bg-white shadow-[-10px_0_20px_rgba(0,0,0,0.05)]">
                        <button onClick={() => setStep(4)} className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-gray-900 active:scale-95 transition-all">
                            Continuar
                        </button>
                    </div>
                )}
            </section>
        );
    }

    // --- PASO 4: CONFIRMACIÓN (DESBLOQUEO DE INPUTS) ---
    if (step === 4) {
        return (
            <section className="animate-in fade-in slide-in-from-right-8 duration-300 flex flex-col h-full bg-gray-50">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-white sticky top-0 z-10">
                    <button onClick={() => setStep(3)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20} /></button>
                    <h2 className="font-bold text-gray-900">Confirma tu Cita</h2>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Resumen */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                            <div>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Servicio</span>
                                <span className="font-black text-xl text-gray-900">{selectedService?.name}</span>
                            </div>
                            <span className="font-black text-xl text-gray-900">${selectedService?.price}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Fecha</span>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Calendar size={14} /> {selectedDate}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Hora</span>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Clock size={14} /> {selectedTime}
                                </div>
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Barbero</span>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <User size={14} /> {selectedStaff?.full_name}
                            </div>
                        </div>
                    </div>

                    {/* Formulario Datos (CORRECCIÓN CRÍTICA: SIEMPRE EDITABLES) */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Tus Datos</h3>

                        <div className="relative group">
                            <User size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black transition-colors" />
                            <input
                                type="text"
                                value={clientData.name}
                                // FIX: Eliminado readOnly para permitir correcciones
                                className="w-full pl-12 p-4 border border-gray-200 bg-white rounded-xl font-medium outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                                placeholder="Nombre completo"
                                onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                            />
                        </div>
                        <div className="relative group">
                            <Phone size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black transition-colors" />
                            <input
                                type="tel"
                                value={clientData.phone}
                                // FIX: Eliminado readOnly. Si no tiene teléfono, ahora puede escribirlo.
                                className="w-full pl-12 p-4 border border-gray-200 bg-white rounded-xl font-medium outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                                placeholder="Teléfono (Obligatorio)"
                                onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                            />
                        </div>
                        <div className="relative group">
                            <Mail size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black transition-colors" />
                            <input
                                type="email"
                                value={clientData.email}
                                // FIX: Email suele ser fijo, pero permitimos editar si es necesario para contacto
                                className="w-full pl-12 p-4 border border-gray-200 bg-white rounded-xl font-medium outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                                placeholder="Correo (Opcional)"
                                onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-white shadow-[-10px_0_20px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={handleBooking}
                        disabled={!clientData.name || !clientData.phone || isSubmitting}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-lg transition-all active:scale-95"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirmar Reserva"}
                    </button>
                </div>
            </section>
        );
    }

    return null;
}