"use client";

import { useState, useEffect, useMemo } from "react";
import { createBooking, getTakenRanges } from "@/app/book/[slug]/actions";
import { Loader2, Calendar, Clock, Check, ChevronLeft, User, Mail, Phone, ChevronRight, Sparkles } from "lucide-react";
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from "framer-motion"; // FIX: Importamos el tipo 'Variants'
import { addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

// --- TIPOS ---
type Service = { id: string; name: string; price: number; duration_min: number; tenant_id: string; category?: string };
type Staff = { id: string; full_name: string; role: string; avatar_url: string | null };
type Schedule = { staff_id: string; day: string; start_time: string; end_time: string; is_active: boolean };
type CurrentUser = { id: string; full_name: string; email: string; phone: string } | null;

// --- UTILS UI ---
// FIX: Tipado explícito ': Variants' para evitar error de inferencia en 'ease'
const containerVariants: Variants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};

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

    // CALENDARIO HORIZONTAL
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    // Generar próximos 14 días
    const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)), []);

    const [selectedTime, setSelectedTime] = useState("");
    const [takenRanges, setTakenRanges] = useState<{ start: number, end: number }[]>([]);

    // Datos Cliente
    const [clientData, setClientData] = useState({
        name: currentUser?.full_name || "",
        phone: currentUser?.phone || "",
        email: currentUser?.email || ""
    });

    // Cargar Slots cuando cambia Fecha o Staff
    useEffect(() => {
        let isMounted = true;
        let intervalId: NodeJS.Timeout;

        async function fetchSlots() {
            if (selectedDate && selectedStaff) {
                setIsLoadingSlots(true);
                try {
                    // Formato YYYY-MM-DD para la API
                    const dateStr = format(selectedDate, 'yyyy-MM-dd');
                    const ranges = await getTakenRanges(selectedStaff.id, dateStr);
                    if (isMounted) setTakenRanges(ranges);
                } catch (error) {
                    console.error(error);
                } finally {
                    if (isMounted) setIsLoadingSlots(false);
                }
            }
        }

        fetchSlots();

        // Auto-refresh cada 30 segundos
        if (selectedDate && selectedStaff) {
            intervalId = setInterval(fetchSlots, 30000);
        }

        return () => {
            isMounted = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [selectedDate, selectedStaff]);

    // Categorías de Servicios
    const groupedServices = useMemo(() => {
        return services.reduce((acc, service) => {
            const cat = service.category || 'Populares';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
        }, {} as Record<string, Service[]>);
    }, [services]);
    const categoryOrder = Object.keys(groupedServices).sort();

    // Generador de Slots
    const slots = useMemo(() => {
        if (!selectedDate || !selectedStaff) return [];

        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        // Usamos en-US para obtener el nombre del día compatible con la BD (monday, tuesday...)
        const dayName = format(selectedDate, 'EEEE', { locale: undefined }).toLowerCase();

        const workSchedule = schedules.find((s) => s.staff_id === selectedStaff?.id && s.day === dayName && s.is_active === true);

        if (!workSchedule) return [];

        const generatedSlots = [];
        const currentTime = new Date(`${dateStr}T${workSchedule.start_time}`);
        const endTime = new Date(`${dateStr}T${workSchedule.end_time}`);
        const now = new Date(); // Para no mostrar horas pasadas hoy

        while (currentTime < endTime) {
            const slotStartMs = currentTime.getTime();
            const slotEndMs = slotStartMs + (selectedService?.duration_min || 30) * 60000;

            // Filtro 1: ¿Ya pasó la hora? (Solo si es hoy)
            if (isSameDay(selectedDate, now) && currentTime < now) {
                currentTime.setMinutes(currentTime.getMinutes() + 30);
                continue;
            }

            // Filtro 2: Colisiones
            const isTaken = takenRanges.some(range => (slotStartMs < range.end && slotEndMs > range.start));

            if (!isTaken) {
                const timeLabel = currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
                const timeValue = currentTime.toLocaleTimeString('en-US', { hour12: false }); // HH:MM:SS
                generatedSlots.push({ label: timeLabel, value: timeValue });
            }
            currentTime.setMinutes(currentTime.getMinutes() + 30);
        }
        return generatedSlots;
    }, [selectedDate, selectedStaff, schedules, takenRanges, selectedService]);

    const handleBooking = async () => {
        if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return;
        setIsSubmitting(true);

        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const dateTime = `${dateStr}T${selectedTime}`;

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

    // --- VISTA ÉXITO ---
    if (success) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 px-6 h-full flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-green-200">
                    <Check size={48} strokeWidth={4} className="text-white" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter">¡Listo!</h2>
                <p className="text-gray-500 mb-8 max-w-[250px] mx-auto leading-relaxed">
                    Tu cita quedó agendada.<br />Te esperamos.
                </p>
                <a href="/app" className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all shadow-xl active:scale-95">
                    Ver mi Ticket
                </a>
            </motion.div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            {/* PROGRESS HEADER */}
            <div className="px-6 pt-6 pb-2 bg-white sticky top-0 z-20 border-b border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    {step > 1 ? (
                        <button onClick={() => setStep(s => s - 1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                    ) : <div className="w-9" />}

                    <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Paso {step} de 4</span>
                    <div className="w-9" />
                </div>
                {/* Barra de progreso */}
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-black"
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / 4) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <AnimatePresence mode="wait">

                    {/* --- PASO 1: SERVICIOS --- */}
                    {step === 1 && (
                        <motion.section key="step1" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="p-4 space-y-8 pb-24">
                            <div className="px-2">
                                <h2 className="text-2xl font-black text-gray-900 leading-tight">Elige tu<br />Experiencia</h2>
                            </div>

                            {categoryOrder.map(category => (
                                <div key={category}>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2 flex items-center gap-2">
                                        {category}
                                    </h3>
                                    <div className="space-y-3">
                                        {groupedServices[category].map((service) => (
                                            <button
                                                key={service.id}
                                                onClick={() => { setSelectedService(service); setStep(2); }}
                                                className="w-full bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-black/5 active:scale-[0.98] transition-all text-left group"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="font-bold text-gray-900 text-lg block group-hover:text-blue-600 transition-colors">{service.name}</span>
                                                        <span className="text-xs text-gray-400 font-medium flex items-center gap-1 mt-1">
                                                            <Clock size={12} /> {service.duration_min} min
                                                        </span>
                                                    </div>
                                                    <span className="font-black text-gray-900 text-base bg-gray-50 px-3 py-1.5 rounded-xl">
                                                        ${service.price}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </motion.section>
                    )}

                    {/* --- PASO 2: STAFF --- */}
                    {step === 2 && (
                        <motion.section key="step2" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="p-4 h-full">
                            <div className="px-2 mb-6">
                                <h2 className="text-2xl font-black text-gray-900">¿Con quién?</h2>
                                <p className="text-gray-500 text-sm">Selecciona a tu profesional.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {staff.map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => { setSelectedStaff(member); setStep(3); }}
                                        className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all text-center group active:scale-95 flex flex-col items-center gap-3 aspect-[3/4] justify-center"
                                    >
                                        <div className="w-20 h-20 rounded-full overflow-hidden relative shadow-md group-hover:scale-105 transition-transform border-4 border-white">
                                            {member.avatar_url ? (
                                                <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-2xl">{member.full_name[0]}</div>
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-900 block">{member.full_name.split(' ')[0]}</span>
                                            <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                                                Barbero
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* --- PASO 3: FECHA (CALENDARIO HORIZONTAL) --- */}
                    {step === 3 && (
                        <motion.section key="step3" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col h-full">
                            <div className="p-6 pb-2">
                                <h2 className="text-2xl font-black text-gray-900">Agenda</h2>
                                <p className="text-gray-500 text-sm">Busca un hueco disponible.</p>
                            </div>

                            {/* DATE STRIP (Scroll Horizontal) */}
                            <div className="pl-6 py-4 overflow-x-auto hide-scrollbar flex gap-3 snap-x">
                                {dates.map((date, i) => {
                                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => { setSelectedDate(date); setSelectedTime(""); }}
                                            className={`snap-start min-w-[70px] flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${isSelected
                                                ? "bg-black text-white border-black shadow-lg scale-105"
                                                : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                                                }`}
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-wider mb-1">
                                                {format(date, 'EEE', { locale: es })}
                                            </span>
                                            <span className="text-xl font-black">
                                                {format(date, 'd')}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="flex-1 p-6 bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-gray-100 overflow-y-auto">
                                {!selectedDate ? (
                                    <div className="text-center py-10 text-gray-300">
                                        <Calendar size={48} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">Selecciona un día arriba</p>
                                    </div>
                                ) : isLoadingSlots ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                        <Loader2 className="animate-spin mb-2" />
                                        <span className="text-xs">Cargando horas...</span>
                                    </div>
                                ) : slots.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="font-bold text-gray-900">Sin disponibilidad 😔</p>
                                        <p className="text-xs text-gray-500">Intenta otro día u otro barbero.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-3">
                                        {slots.map((s: any) => (
                                            <button
                                                key={s.value}
                                                onClick={() => setSelectedTime(s.value)}
                                                className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${selectedTime === s.value
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                                                    : "bg-white text-gray-700 border-gray-100 hover:border-blue-200"
                                                    }`}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedTime && (
                                <div className="p-4 bg-white border-t border-gray-100 safe-area-bottom">
                                    <button onClick={() => setStep(4)} className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-gray-900 active:scale-95 transition-all">
                                        Continuar
                                    </button>
                                </div>
                            )}
                        </motion.section>
                    )}

                    {/* --- PASO 4: CONFIRMACIÓN (FIXED INPUTS) --- */}
                    {step === 4 && (
                        <motion.section key="step4" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="p-6 h-full flex flex-col">
                            <h2 className="text-2xl font-black text-gray-900 mb-6">Confirma tu cita</h2>

                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl mb-8 space-y-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                                    <div>
                                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Servicio</span>
                                        <span className="font-black text-xl text-gray-900">{selectedService?.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Precio</span>
                                        <span className="font-black text-xl text-gray-900">${selectedService?.price}</span>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1 bg-gray-50 p-3 rounded-xl">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Fecha</span>
                                        <div className="flex items-center gap-2 font-bold text-sm">
                                            <Calendar size={14} className="text-blue-500" />
                                            {selectedDate && format(selectedDate, 'dd MMM', { locale: es })}
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-gray-50 p-3 rounded-xl">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Hora</span>
                                        <div className="flex items-center gap-2 font-bold text-sm">
                                            <Clock size={14} className="text-purple-500" />
                                            {selectedTime}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Tus Datos</label>
                                <div className="relative group">
                                    <User size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black transition-colors" />
                                    <input
                                        type="text"
                                        value={clientData.name}
                                        className="w-full pl-12 p-4 bg-gray-50 border border-transparent rounded-2xl font-bold focus:bg-white focus:border-black focus:ring-0 transition-all outline-none"
                                        placeholder="Tu nombre"
                                        onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                                    />
                                </div>
                                <div className="relative group">
                                    <Phone size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black transition-colors" />
                                    <input
                                        type="tel"
                                        value={clientData.phone}
                                        className="w-full pl-12 p-4 bg-gray-50 border border-transparent rounded-2xl font-bold focus:bg-white focus:border-black focus:ring-0 transition-all outline-none"
                                        placeholder="Teléfono"
                                        onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                                    />
                                </div>
                                {!currentUser && (
                                    <div className="relative group">
                                        <Mail size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black transition-colors" />
                                        <input
                                            type="email"
                                            className="w-full pl-12 p-4 bg-gray-50 border border-transparent rounded-2xl font-bold focus:bg-white focus:border-black focus:ring-0 transition-all outline-none"
                                            placeholder="Correo (Opcional)"
                                            onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            <button onClick={handleBooking} disabled={!clientData.name || !clientData.phone || isSubmitting} className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center transition-all mt-6 active:scale-95">
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirmar Reserva"}
                            </button>
                        </motion.section>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}