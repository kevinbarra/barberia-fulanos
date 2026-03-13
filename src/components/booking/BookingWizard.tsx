"use client";

import { useState, useEffect, useMemo } from "react";
import { createBooking, getTakenRanges } from "@/app/book/[slug]/actions";
import { Loader2, Calendar, Clock, Check, ChevronLeft, User, Mail, Phone, ChevronRight, Sparkles, CalendarPlus, Gift, Lock, ExternalLink, MessageCircle, Briefcase, MapPin, Share2, Wallet, CreditCard, LayoutGrid, Scissors, Wind, Hand, Palette, Heart, Star, Gem } from "lucide-react";
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from "framer-motion";
import { addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useVocabulary } from "@/providers/BusinessVocabularyProvider";

// --- TIPOS ---
type Service = { id: string; name: string; price: number; duration_min: number; tenant_id: string; category?: string; description?: string; category_id?: string };
type Staff = { id: string; full_name: string; role: string; avatar_url: string | null; phone?: string | null; services?: string[]; skills?: string[]; staff_category?: string; role_alias?: string | null };
type Schedule = { staff_id: string; day: string; start_time: string; end_time: string; is_active: boolean };
type CurrentUser = { id: string; full_name: string; email: string; phone: string | null } | null;

type BookingResult = {
    id: string;
    guest_name: string;
    guest_email: string | null;
    guest_phone?: string | null;
    service_name: string;
    service_price: number;
    start_time: string;
    staff_name: string;
    date_formatted: string;
    time_formatted: string;
};

// --- UTILS UI ---
const containerVariants: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { 
            duration: 0.4, 
            ease: [0.23, 1, 0.32, 1] 
        } 
    },
    exit: { 
        opacity: 0, 
        y: -10, 
        scale: 0.98,
        transition: { duration: 0.3 } 
    }
};

const checkmarkVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
        scale: 1, 
        opacity: 1, 
        transition: { 
            type: "spring" as const, 
            stiffness: 260, 
            damping: 20,
            delay: 0.2 
        } 
    }
};

// Generate Google Calendar link
function generateCalendarLink(booking: BookingResult, serviceDuration: number): string {
    const startDate = new Date(booking.start_time);
    const endDate = new Date(startDate.getTime() + serviceDuration * 60000);

    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `${booking.service_name} - Cita`,
        dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
        details: `Tu cita con ${booking.staff_name}.\n\nServicio: ${booking.service_name}\nPrecio: $${booking.service_price}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Generate WhatsApp confirmation link
function generateWhatsAppConfirmation(booking: BookingResult, phone: string, tenantName?: string): string {
    const clientName = booking.guest_name || 'Cliente';
    const clientPhone = booking.guest_phone || '';
    const serviceName = booking.service_name || 'Servicio';
    const barberName = booking.staff_name || 'Staff';
    const bookingDate = booking.date_formatted || new Date(booking.start_time).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const bookingTime = booking.time_formatted || new Date(booking.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    const wave = '👋';
    const scissors = '✂️';
    const checkmark = '✅';

    const greeting = tenantName ? `¡Hola ${tenantName}! ${wave}` : `¡Hola! ${wave}`;
    const clientLine = clientPhone
        ? `👤 *Cliente:* ${clientName} (${clientPhone})`
        : `👤 *Cliente:* ${clientName}`;

    const message = [
        `${greeting} Acabo de agendar por la App:`,
        '',
        clientLine,
        `${scissors} *Servicio:* ${serviceName}`,
        `*Atendido por:* ${barberName}`,
        `📅 *Fecha:* ${bookingDate}`,
        `⏰ *Hora:* ${bookingTime}`,
        '',
        `${checkmark} ¡Confírmame si todo bien! Gracias.`
    ].join('\n');

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// Generate WhatsApp reminder link (Requested for Phase 37)
function generateWhatsAppReminder(booking: BookingResult, phone: string, tenantName: string): string {
    const serviceName = booking.service_name;
    const staffName = booking.staff_name;
    const date = booking.date_formatted;
    const time = booking.time_formatted;
    const guestName = booking.guest_name || 'Cliente';
    const guestPhone = booking.guest_phone || '';
    const paymentId = booking.id.slice(0, 8).toUpperCase();

    const message = [
        `¡Hola ${tenantName}! 👋 Acabo de agendar por la App:`,
        `👤 Cliente: ${guestName} (${guestPhone})`,
        `✂️ Servicio: ${serviceName}`,
        `Atendido por: ${staffName}`,
        `📅 Fecha: ${date}`,
        `⏰ Hora: ${time}`,
        `🧾 Comprobante: ${paymentId}`,
        `✅ ¡Confírmame si todo bien! Gracias.`
    ].join('\n');
    
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function BookingWizard({
    services,
    staff,
    schedules,
    currentUser,
    whatsappPhone,
    tenantName,
    businessType = 'barber',
    paymentRules = { mode: 'Libre' }
}: {
    services: Service[];
    staff: Staff[];
    schedules: Schedule[];
    currentUser?: CurrentUser;
    whatsappPhone?: string | null;
    tenantName?: string;
    businessType?: 'barber' | 'salon' | 'nails' | 'default';
    paymentRules?: any;
}) {
    // Hooks
    const searchParams = useSearchParams();
    const origin = searchParams.get('source') || 'web';

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [success, setSuccess] = useState(false);
    const [bookingData, setBookingData] = useState<BookingResult | null>(null);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

    // Selección
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState("");
    const [takenRangesByStaff, setTakenRangesByStaff] = useState<Record<string, { start: number, end: number }[]>>({});

    // Datos Cliente
    const [clientData, setClientData] = useState({
        name: currentUser?.full_name || "",
        phone: currentUser?.phone || "",
        email: currentUser?.email || ""
    });

    const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)), []);
    const { vocabulary } = useVocabulary();
    const staffLabel = vocabulary.staff_singular;

    const filteredStaff = useMemo(() => {
        if (!selectedService) return staff;

        // 1. Try filtering by explicit skills
        const staffWithSkill = staff.filter(s => s.skills?.includes(selectedService.id));
        if (staffWithSkill.length > 0) return staffWithSkill;

        // 2. Try filtering by category matching
        const serviceCat = (selectedService.category || '').toLowerCase();
        const staffByCat = staff.filter(s => {
            const staffCat = (s.staff_category || '').toLowerCase();
            if (!staffCat || staffCat === 'default') return true;
            return serviceCat.includes(staffCat) || staffCat.includes(serviceCat);
        });

        // 3. SAFETY FALLBACK: If filtering returns nothing, show all staff
        // to prevent bricking the booking flow for unconfigured tenants.
        if (staffByCat.length === 0) return staff;

        return staffByCat;
    }, [staff, selectedService]);

    useEffect(() => {
        let isMounted = true;
        let intervalId: NodeJS.Timeout;
        async function fetchSlots() {
            if (selectedDate && selectedStaff && filteredStaff.length > 0) {
                setIsLoadingSlots(true);
                try {
                    const dateStr = format(selectedDate, 'yyyy-MM-dd');
                    const staffToFetch = selectedStaff.id === 'any' ? filteredStaff : [selectedStaff];
                    const newRanges: Record<string, { start: number, end: number }[]> = {};
                    await Promise.all(staffToFetch.map(async (s) => {
                        const ranges = await getTakenRanges(s.id, dateStr);
                        newRanges[s.id] = ranges;
                    }));
                    if (isMounted) setTakenRangesByStaff(newRanges);
                } catch (e) { console.error(e); } 
                finally { if (isMounted) setIsLoadingSlots(false); }
            }
        }
        fetchSlots();
        if (selectedDate && selectedStaff) {
            intervalId = setInterval(fetchSlots, 30000);
        }
        return () => { isMounted = false; if (intervalId) clearInterval(intervalId); };
    }, [selectedDate, selectedStaff, filteredStaff]);

    const groupedServices = useMemo(() => {
        return services.reduce((acc, service) => {
            const cat = service.category || 'Populares';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
        }, {} as Record<string, Service[]>);
    }, [services]);
    const categoryOrder = Object.keys(groupedServices).sort();

    const slots = useMemo(() => {
        if (!selectedDate || !selectedStaff) return [];
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const dayName = format(selectedDate, 'EEEE', { locale: undefined }).toLowerCase();
        const now = new Date();
        const staffToCheck = selectedStaff.id === 'any' ? filteredStaff : [selectedStaff];
        const slotsMap = new Map<string, { label: string, value: string }>();

        staffToCheck.forEach((member) => {
            const workSchedule = schedules.find((s) => s.staff_id === member.id && s.day === dayName && s.is_active === true);
            if (!workSchedule) return;
            const takenRanges = takenRangesByStaff[member.id] || [];
            const currentTime = new Date(`${dateStr}T${workSchedule.start_time}`);
            const endTime = new Date(`${dateStr}T${workSchedule.end_time}`);
            while (currentTime < endTime) {
                const slotStartMs = currentTime.getTime();
                const slotEndMs = slotStartMs + (selectedService?.duration_min || 30) * 60000;
                if (isSameDay(selectedDate, now) && currentTime < now) {
                    currentTime.setMinutes(currentTime.getMinutes() + 30);
                    continue;
                }
                const isTaken = takenRanges.some(range => (slotStartMs < range.end && slotEndMs > range.start));
                if (!isTaken) {
                    const timeLabel = currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
                    const timeValue = currentTime.toLocaleTimeString('en-US', { hour12: false });
                    if (!slotsMap.has(timeValue)) slotsMap.set(timeValue, { label: timeLabel, value: timeValue });
                }
                currentTime.setMinutes(currentTime.getMinutes() + 30);
            }
        });
        return Array.from(slotsMap.values()).sort((a, b) => a.value.localeCompare(b.value));
    }, [selectedDate, selectedStaff, schedules, takenRangesByStaff, selectedService, filteredStaff]);

    const handleBooking = async () => {
        if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return;
        setIsSubmitting(true);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const dateTime = `${dateStr}T${selectedTime}`;
        const isAnyStaff = selectedStaff.id === 'any';

        const result = await createBooking({
            tenant_id: selectedService.tenant_id,
            service_id: selectedService.id,
            staff_id: selectedStaff.id,
            start_time: dateTime,
            duration_min: selectedService.duration_min,
            client_name: clientData.name,
            client_phone: clientData.phone,
            client_email: clientData.email,
            customer_id: currentUser?.id || null,
            origin: origin,
            is_any_staff: isAnyStaff,
            available_staff_ids: isAnyStaff ? filteredStaff.map(s => s.id) : []
        });

        setIsSubmitting(false);
        if (result.success && result.booking) {
            setBookingData(result.booking);
            if (result.payment_url) {
                setPaymentUrl(result.payment_url);
                window.location.href = result.payment_url;
            } else {
                setSuccess(true);
            }
        } else {
            alert(result.error || "Error al reservar");
        }
    };

    // --- CÁLCULO DE DEPÓSITO (Fase 29) ---
    const calculateBreakdown = useMemo(() => {
        if (!selectedService) return { total: 0, deposit: 0, balance: 0 };
        const total = selectedService.price;
        const mode = paymentRules?.mode || 'Libre';
        const threshold = Number(paymentRules?.threshold_amount || 0);
        let deposit = 0;

        if (mode === 'Pago Total') {
            deposit = total;
        } else if (mode === 'Anticipo' && total >= threshold) {
            if (paymentRules.deposit_type === 'percentage') {
                deposit = (total * Number(paymentRules.deposit_value || 0)) / 100;
            } else {
                deposit = Math.min(total, Number(paymentRules.deposit_value || 0));
            }
        }

        return {
            total,
            deposit,
            balance: total - deposit
        };
    }, [selectedService, paymentRules]);

    const [countdown, setCountdown] = useState(15 * 60);
    useEffect(() => {
        if (!success) return;
        const timer = setInterval(() => setCountdown(prev => (prev <= 0 ? 0 : prev - 1)), 1000);
        return () => clearInterval(timer);
    }, [success]);

    // --- VISTA ÉXITO PREMIUM (Fase 29) ---
    if (success && bookingData) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 flex flex-col items-center justify-center min-h-full text-center">
                <motion.div variants={checkmarkVariants} initial="hidden" animate="visible" className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mb-6 shadow-2xl shadow-green-200">
                    <Check size={48} strokeWidth={4} />
                </motion.div>

                <h2 className="text-3xl font-black text-gray-900 mb-2">¡Cita Confirmada!</h2>
                <p className="text-gray-500 mb-8">Todo listo para tu visita a {tenantName}</p>

                <div className="w-full bg-white rounded-3xl border-2 border-gray-50 p-6 shadow-sm mb-8 space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400 font-bold uppercase tracking-widest">Servicio</span>
                        <span className="font-black text-gray-900">{bookingData.service_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400 font-bold uppercase tracking-widest">Cuándo</span>
                        <span className="font-black text-gray-900">{bookingData.date_formatted} - {bookingData.time_formatted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400 font-bold uppercase tracking-widest">Atiende</span>
                        <span className="font-black text-gray-900">{bookingData.staff_name}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 w-full">
                    <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenantName || '')}`}
                        target="_blank"
                        className="flex items-center justify-center gap-2 w-full py-4 bg-black text-white rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <MapPin size={18} /> Abrir en Google Maps
                    </a>
                    
                    {whatsappPhone && (
                        <a 
                            href={generateWhatsAppReminder(bookingData, whatsappPhone, tenantName || 'Negocio')}
                            target="_blank"
                            className="flex items-center justify-center gap-2 w-full py-4 bg-green-500 text-white rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95"
                        >
                            <MessageCircle size={18} /> Enviar recordatorio WhatsApp
                        </a>
                    )}

                    <button 
                        onClick={() => window.location.href = '/app'}
                        className="text-gray-400 font-bold text-sm py-2"
                    >
                        Ver mis próximas citas
                    </button>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100 w-full">
                    <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em] mb-4">Añadir a Calendario</p>
                    <div className="flex justify-center gap-4">
                        <a href={generateCalendarLink(bookingData, selectedService?.duration_min || 30)} target="_blank" className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-black transition-colors">
                            <CalendarPlus size={20} />
                        </a>
                    </div>
                </div>
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
                    <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Paso {step} de 5</span>
                    <div className="w-9" />
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-brand" initial={{ width: 0 }} animate={{ width: `${(step / 5) * 100}%` }} transition={{ duration: 0.3 }} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <AnimatePresence mode="wait">
                    {/* PASO 1: CATEGORÍAS Y SERVICIOS */}
                    {step === 1 && (
                        <motion.section key="step1" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="p-4 space-y-8 pb-24">
                            {!selectedCategory ? (
                                <>
                                    <div className="px-2">
                                        <h2 className="text-2xl font-black text-gray-900 leading-tight">¿Qué estas<br />buscando?</h2>
                                        <p className="text-gray-500 text-sm mt-1">Elige una categoría para ver los servicios.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {categoryOrder.map(category => {
                                            // Dynamic Icon Mapping for Industry Parity
                                            const iconMap: Record<string, { icon: any, color: string }> = {
                                                'Cortes': { icon: Scissors, color: 'bg-blue-500/10 text-blue-600' },
                                                'Barba': { icon: Sparkles, color: 'bg-amber-500/10 text-amber-600' },
                                                'Cabello': { icon: Wind, color: 'bg-purple-500/10 text-purple-600' },
                                                'Uñas': { icon: Hand, color: 'bg-pink-500/10 text-pink-600' },
                                                'Tintes': { icon: Palette, color: 'bg-indigo-500/10 text-indigo-600' },
                                                'Masajes': { icon: Heart, color: 'bg-rose-500/10 text-rose-600' },
                                                'Extras': { icon: Star, color: 'bg-orange-500/10 text-orange-600' },
                                                'Combos': { icon: Gem, color: 'bg-emerald-500/10 text-emerald-600' },
                                                'General': { icon: LayoutGrid, color: 'bg-gray-500/10 text-gray-600' }
                                            };
                                            const config = iconMap[category] || iconMap['General'];
                                            const CategoryIcon = config.icon;

                                            return (
                                                <button 
                                                    key={category} 
                                                    onClick={() => setSelectedCategory(category)}
                                                    className="group relative bg-white/70 backdrop-blur-md p-6 rounded-[2rem] border border-white/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center flex flex-col items-center gap-4 aspect-square justify-center overflow-hidden"
                                                >
                                                    <div className={`w-16 h-16 rounded-full ${config.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative z-10`}>
                                                        <CategoryIcon size={32} />
                                                    </div>
                                                    <span className="font-black text-gray-900 text-sm uppercase tracking-tight relative z-10">{category}</span>
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="px-2 flex items-center justify-between">
                                        <div>
                                            <button 
                                                onClick={() => setSelectedCategory(null)}
                                                className="flex items-center gap-1 text-xs font-bold text-brand uppercase tracking-widest mb-2"
                                            >
                                                <ChevronLeft size={14} /> Volver a categorías
                                            </button>
                                            <h2 className="text-2xl font-black text-gray-900 leading-tight">{selectedCategory}</h2>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {groupedServices[selectedCategory].map((service) => (
                                            <button 
                                                key={service.id} 
                                                onClick={() => { setSelectedService(service); setStep(2); }} 
                                                className="w-full bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] border border-white/40 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 text-left group"
                                            >
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <span className="font-bold text-gray-900 text-lg block group-hover:text-brand transition-colors">{service.name}</span>
                                                        {service.description && <p className="text-sm text-gray-500 mt-1">{service.description}</p>}
                                                        <span className="text-xs text-gray-400 font-medium flex items-center gap-1 mt-3">
                                                            <div className="p-1.5 bg-gray-50 rounded-lg group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                                                                <Clock size={12} />
                                                            </div>
                                                            {service.duration_min} min
                                                        </span>
                                                    </div>
                                                    <span className="font-black text-brand bg-brand/5 px-4 py-2 rounded-2xl transition-all group-hover:bg-brand group-hover:text-white shadow-sm ring-1 ring-brand/10">${service.price}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </motion.section>
                    )}

                    {/* PASO 2: STAFF */}
                    {step === 2 && (
                        <motion.section key="step2" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="p-4">
                            <div className="px-2 mb-6">
                                <h2 className="text-2xl font-black text-gray-900">¿Con quién?</h2>
                                <p className="text-gray-500 text-sm">Selecciona a tu {staffLabel.toLowerCase()}.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => { setSelectedStaff({ id: 'any', full_name: 'Cualquiera', role: 'Staff', avatar_url: null }); setStep(3); }}
                                    className="bg-white/80 backdrop-blur-md p-4 rounded-[2.5rem] border border-white/40 shadow-sm hover:shadow-xl transition-all text-center flex flex-col items-center gap-4 aspect-square justify-center group"
                                >
                                    <div className="w-24 h-24 rounded-full bg-amber-50/50 border-8 border-white shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                        <Sparkles size={40} className="text-amber-500" />
                                    </div>
                                    <span className="font-bold text-gray-900 block group-hover:text-amber-600 transition-colors">Cualquiera</span>
                                </button>
                                {filteredStaff.map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => { setSelectedStaff(member); setStep(3); }}
                                        className="bg-white/80 backdrop-blur-md p-4 rounded-[2.5rem] border border-white/40 shadow-sm hover:shadow-xl transition-all text-center flex flex-col items-center gap-4 aspect-square justify-center group"
                                    >
                                        <div className="w-24 h-24 rounded-full overflow-hidden relative border-8 border-white shadow-lg bg-gray-100 group-hover:scale-110 transition-transform duration-500">
                                            {member.avatar_url ? <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-2xl">{member.full_name[0]}</div>}
                                        </div>
                                        <span className="font-bold text-gray-900 block truncate w-full px-2 group-hover:text-brand transition-colors">{member.full_name.split(' ')[0]}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* PASO 3: FECHA */}
                    {step === 3 && (
                        <motion.section key="step3" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col h-full">
                            <div className="p-6 pb-2">
                                <h2 className="text-2xl font-black text-gray-900">Agenda</h2>
                                <p className="text-gray-500 text-sm">Busca un hueco disponible.</p>
                            </div>
                            <div className="pl-6 py-4 overflow-x-auto hide-scrollbar flex gap-3">
                                {dates.map((date, i) => {
                                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                                    return (
                                        <button key={i} onClick={() => { setSelectedDate(date); setSelectedTime(""); }} className={`min-w-[70px] flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${isSelected ? "bg-brand text-white border-brand shadow-lg scale-105" : "bg-white text-gray-400 border-gray-100"}`}>
                                            <span className="text-[10px] font-bold uppercase mb-1">{format(date, 'EEE', { locale: es })}</span>
                                            <span className="text-xl font-black">{format(date, 'd')}</span>
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="flex-1 p-6 bg-white rounded-t-[32px] shadow-sm border-t border-gray-50 overflow-y-auto">
                                {!selectedDate ? <div className="text-center py-10 text-gray-300">Selecciona un día</div> : isLoadingSlots ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : slots.length === 0 ? <div className="text-center py-10 text-gray-500 font-bold">No hay horarios disponibles</div> : (
                                    <div className="grid grid-cols-3 gap-3">
                                        {slots.map((s: any) => (
                                            <button key={s.value} onClick={() => setSelectedTime(s.value)} className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${selectedTime === s.value ? "bg-black text-white border-black shadow-md" : "bg-white text-gray-700 border-gray-50 hover:border-gray-200"}`}>
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {selectedTime && (
                                <div className="p-4 bg-white border-t border-gray-50">
                                    <button onClick={() => setStep(4)} className="w-full bg-black text-white py-4 rounded-2xl font-bold">Continuar</button>
                                </div>
                            )}
                        </motion.section>
                    )}

                    {/* PASO 4: DATOS CLIENTE */}
                    {step === 4 && (
                        <motion.section key="step4" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="p-6 flex flex-col">
                            <h2 className="text-2xl font-black text-gray-900 mb-6">Tus Datos</h2>
                            <div className="space-y-4 flex-1">
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-4 text-gray-400" />
                                    <input type="text" value={clientData.name} className="w-full pl-12 p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-black transition-all" placeholder="Nombre completo" onChange={(e) => setClientData({ ...clientData, name: e.target.value })} />
                                </div>
                                <div className="relative">
                                    <Phone size={18} className="absolute left-4 top-4 text-gray-400" />
                                    <input type="tel" value={clientData.phone} className="w-full pl-12 p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-black transition-all" placeholder="WhatsApp (10 dígitos)" onChange={(e) => setClientData({ ...clientData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                                </div>
                                {!currentUser && (
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-4 top-4 text-gray-400" />
                                        <input type="email" value={clientData.email} className="w-full pl-12 p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-black transition-all" placeholder="Email (opcional)" onChange={(e) => setClientData({ ...clientData, email: e.target.value })} />
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => setStep(5)} 
                                disabled={!clientData.name || clientData.phone.length !== 10} 
                                className="w-full bg-black text-white py-4 rounded-2xl font-bold disabled:opacity-30 mt-8"
                            >
                                Revisar Resumen
                            </button>
                        </motion.section>
                    )}

                    {/* PASO 5: RESUMEN Y PAGO (Fase 29) */}
                    {step === 5 && (
                        <motion.section key="step5" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="p-6 h-full flex flex-col">
                            <h2 className="text-2xl font-black text-gray-900 mb-6">Resumen de Pago</h2>
                            
                            <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden mb-6">
                                <div className="p-6 bg-gray-50/50 border-b border-gray-100 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Servicio Reservado</p>
                                            <h3 className="text-xl font-black text-gray-900">{selectedService?.name}</h3>
                                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                                <Calendar size={14} /> {selectedDate && format(selectedDate, 'dd MMMM', { locale: es })} @ {selectedTime}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-xl text-gray-900">${selectedService?.price}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tus Datos</p>
                                            <h4 className="text-sm font-bold text-gray-900">{clientData.name}</h4>
                                            <p className="text-xs text-gray-400 font-medium">{clientData.phone}</p>
                                        </div>
                                        <button 
                                            onClick={() => setStep(4)}
                                            className="text-[10px] font-black text-brand uppercase tracking-widest bg-brand/5 px-2 py-1 rounded-lg"
                                        >
                                            Editar
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2 text-gray-500 font-medium">
                                            <Wallet size={16} className="text-brand" /> Pago hoy para asegurar
                                        </div>
                                        <span className="font-black text-brand text-lg">${calculateBreakdown.deposit.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2 text-gray-400 font-medium">
                                            <CreditCard size={16} /> Pago restante en sucursal
                                        </div>
                                        <span className="font-black text-gray-400">${calculateBreakdown.balance.toLocaleString()}</span>
                                    </div>
                                    
                                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total del Servicio</span>
                                        <span className="text-2xl font-black text-gray-900">${calculateBreakdown.total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 mt-auto">
                                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                    <Lock size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-900 leading-relaxed font-medium">
                                        Tu pago está protegido por <b>Mercado Pago</b>. <br />
                                        {calculateBreakdown.deposit > 0 ? "Al confirmar, serás redirigido para completar el anticipo." : "No se requiere pago previo para este servicio."}
                                    </p>
                                </div>

                                <button
                                    onClick={handleBooking}
                                    disabled={isSubmitting}
                                    className="w-full bg-brand text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-brand/20 active:scale-95 transition-all flex justify-center items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : (calculateBreakdown.deposit > 0 ? "PROCEDER AL PAGO →" : "CONFIRMAR RESERVA")}
                                </button>
                                
                                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest px-4">
                                    Al continuar, aceptas nuestras políticas de cancelación.
                                </p>
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>
            </div>

            {/* HIGH-PERFORMANCE BRANDING FOOTER */}
            <div className="py-6 border-t border-gray-100/50 bg-white/80 backdrop-blur-lg flex justify-center items-center">
                <a 
                    href="https://kevinconsulting.services" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 group transition-all duration-300"
                >
                    <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400 group-hover:text-gray-600 transition-colors">Tecnología que profesionaliza tu negocio |</span>
                    <span className="text-[10px] font-black tracking-tight bg-black text-white px-2 py-1 rounded-md shadow-sm group-hover:bg-brand group-hover:scale-105 transition-all">kevinconsulting.services</span>
                </a>
            </div>
        </div>
    );
}