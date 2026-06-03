"use client";

import { useState, useEffect, useMemo } from "react";
import { createBooking, getTakenRanges } from "@/app/book/[slug]/actions";
import { Loader2, Calendar, Clock, Check, ChevronLeft, User, Mail, Phone, ChevronRight, Sparkles, CalendarPlus, Gift, ExternalLink, MessageCircle, Briefcase, MapPin, Share2, LayoutGrid, Scissors, Wind, Hand, Palette, Heart, Star, Gem } from "lucide-react";
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from "framer-motion";
import { addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useVocabulary } from "@/providers/BusinessVocabularyProvider";
import { toast } from "sonner";
import { GLOBAL_BRANDING } from "@/lib/constants";

// --- TIPOS ---
type Service = { id: string; name: string; price: number; duration_min: number; tenant_id: string; category?: string; description?: string; category_id?: string; category_order?: number; order?: number };
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
    staff_phone?: string | null;
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

// Ensure Mexican country code prefix (Phase 42 — Sanitized)
function ensureMexicoPrefix(phone: string): string {
    const cleanNumber = phone.replace(/\D/g, '');
    // 10-digit local number → prepend 52
    if (cleanNumber.length === 10) return '52' + cleanNumber;
    // Already has country code (12+ digits starting with 52)
    if (cleanNumber.startsWith('52')) return cleanNumber;
    // Fallback: prepend 52
    return '52' + cleanNumber;
}

// Helper to remove emojis for a high-end alphanumeric look (Phase 49b)
const stripEmojis = (str: string) => {
    if (!str) return '';
    return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F191}-\u{1F19A}\u{1F1E6}-\u{1F1FF}]/gu, '').trim();
};

// Generate WhatsApp reminder link (Phase 42 — api.whatsapp.com/send)
function generateWhatsAppReminder(booking: BookingResult, phone: string, tenantName: string): string {
    const normalizedPhone = ensureMexicoPrefix(phone);
    
    // Sanitize each variable individually
    const tenant = (tenantName || 'Negocio').trim();
    const name = (booking.guest_name || 'Cliente').trim();
    const gPhone = (booking.guest_phone || '').trim();
    const service = (booking.service_name || '').trim();
    const staffName = (booking.staff_name || '').trim();
    const date = (booking.date_formatted || '').trim();
    const time = (booking.time_formatted || '').trim();

    // Build the full message as a single template string
    const finalMessage = `\u00a1Hola ${tenant}! \uD83D\uDC4B Acabo de agendar por la App:\n\uD83D\uDC64 Cliente: ${name} (${gPhone})\n\u2702\uFE0F Servicio: ${service}\nAtendido por: ${staffName}\n\uD83D\uDCC5 Fecha: ${date}\n\u23F0 Hora: ${time}\n\u2705 \u00a1Conf\u00edrmame si todo bien! Gracias.`;

    return `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(finalMessage)}`;
}

// Validate WhatsApp link before rendering — invalid links get logged, not shown to client
function validateWhatsAppLink(url: string, context: { staffName?: string; phone?: string }): boolean {
    try {
        const parsed = new URL(url);
        const phone = parsed.searchParams.get('phone') || '';
        const text = parsed.searchParams.get('text') || '';
        // Phone must be 12 digits (52 + 10), text must not be empty
        if (!/^\d{12}$/.test(phone)) {
            console.error('[WhatsApp INVALID] Phone format wrong:', phone, '| Staff:', context.staffName, '| Raw:', context.phone);
            return false;
        }
        if (!text || text.length < 10) {
            console.error('[WhatsApp INVALID] Message too short or empty');
            return false;
        }
        return true;
    } catch {
        console.error('[WhatsApp INVALID] URL parse failed:', url);
        return false;
    }
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
    const USE_FAST_BOOKING = true;

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [success, setSuccess] = useState(false);
    const [bookingData, setBookingData] = useState<BookingResult | null>(null);


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
        // Data Guard: never render staff with null/empty names
        const validStaff = staff.filter(s => s.full_name?.trim());
        if (!selectedService) return validStaff;

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

    // Auto-select if only 1 barber available (Phase 46)
    useEffect(() => {
        if (step === 2 && filteredStaff.length === 1 && !selectedStaff) {
            setSelectedStaff(filteredStaff[0]);
            setStep(3);
        }
    }, [step, filteredStaff, selectedStaff]);

    const groupedServices = useMemo(() => {
        return services.reduce((acc, service) => {
            const cat = service.category || 'Populares';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
        }, {} as Record<string, Service[]>);
    }, [services]);
    const categoryOrder = useMemo(() => {
        const categories = Object.keys(groupedServices).map(name => ({
            name,
            order: groupedServices[name][0]?.category_order || 0
        }));
        return categories.sort((a, b) => a.order - b.order).map(c => c.name);
    }, [groupedServices]);

    const slots = useMemo(() => {
        if (!selectedDate || !selectedStaff) return [];
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const dayName = format(selectedDate, 'EEEE', { locale: undefined }).toLowerCase();
        const now = new Date();
        const staffToCheck = selectedStaff ? [selectedStaff] : [];
        const slotsMap = new Map<string, { label: string, value: string }>();

        // Collect ALL possible time slots and check availability across staff
        // For single staff: a slot appears if that staff is free
        const candidateSlots = new Map<string, { label: string; value: string; freeCount: number }>();

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
                const timeValue = currentTime.toLocaleTimeString('en-US', { hour12: false });
                const isTaken = takenRanges.some(range => (slotStartMs < range.end && slotEndMs > range.start));

                if (!isTaken) {
                    const existing = candidateSlots.get(timeValue);
                    if (existing) {
                        existing.freeCount++;
                    } else {
                        const timeLabel = currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
                        candidateSlots.set(timeValue, { label: timeLabel, value: timeValue, freeCount: 1 });
                    }
                }
                currentTime.setMinutes(currentTime.getMinutes() + 30);
            }
        });

        // Filter: only include slots where at least 1 staff member is free
        for (const [key, slot] of candidateSlots) {
            if (slot.freeCount > 0) {
                slotsMap.set(key, { label: slot.label, value: slot.value });
            }
        }

        return Array.from(slotsMap.values()).sort((a, b) => a.value.localeCompare(b.value));
    }, [selectedDate, selectedStaff, schedules, takenRangesByStaff, selectedService, filteredStaff]);

    const handleBooking = async () => {
        if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return;

        // --- PRE-FLIGHT VALIDATION (Phase 47) ---
        // Ensure staff or tenant has a valid phone before hitting the DB
        const preFlightPhone = selectedStaff.phone || whatsappPhone;
        if (!preFlightPhone || preFlightPhone.replace(/\D/g, '').length < 10) {
            toast.error(`El ${staffLabel.toLowerCase()} no tiene un teléfono de contacto válido configurado.`);
            console.error('[Pre-Flight] Aborting booking due to invalid staff/tenant phone:', preFlightPhone);
            return;
        }

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
            customer_id: currentUser?.id || null,
            origin: origin,
            is_any_staff: false,
            available_staff_ids: []
        });

        setIsSubmitting(false);

        if (result.success && result.booking) {
            // Determine WhatsApp URL immediately
            const resolvedPhone = result.booking.staff_phone || selectedStaff.phone || whatsappPhone || '';
            const waUrl = generateWhatsAppReminder(result.booking, resolvedPhone, tenantName || 'Negocio');

            if (USE_FAST_BOOKING) {
                // REDIRECCIÓN DIRECTA (Elimina fricción)
                window.location.assign(waUrl);
            } else {
                // FLUJO LEGACY (Muestra Success Screen integrada)
                setBookingData(result.booking);
                setSuccess(true);
            }
        } else {
            toast.error(result.error || "Error al reservar");
        }
    };



    const [countdown, setCountdown] = useState(10 * 60);
    useEffect(() => {
        if (!success) return;
        const timer = setInterval(() => setCountdown(prev => (prev <= 0 ? 0 : prev - 1)), 1000);
        return () => clearInterval(timer);
    }, [success]);

    const formatCountdown = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    // Resolve WhatsApp phone: bookingData.staff_phone (from server) > selectedStaff.phone > tenant phone
    const resolvedWhatsAppPhone = (() => {
        const staffPhone = bookingData?.staff_phone || selectedStaff?.phone;
        if (staffPhone) return staffPhone;
        console.error('[WhatsApp Routing] Staff phone missing for:', bookingData?.staff_name, '| selectedStaff:', selectedStaff?.full_name, '| Falling back to tenant phone:', whatsappPhone);
        return whatsappPhone;
    })();

    // --- VISTA ÉXITO – PASO FINAL (Fase 40) ---
    if (success && bookingData) {
        const isExpired = countdown <= 0;
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 flex flex-col items-center justify-center min-h-full text-center">
                <motion.div variants={checkmarkVariants} initial="hidden" animate="visible" className="w-20 h-20 bg-amber-400 rounded-full flex items-center justify-center text-white mb-6 shadow-xl shadow-amber-100">
                    <MessageCircle size={40} strokeWidth={2.5} />
                </motion.div>

                <h2 className="text-3xl font-black text-gray-900 mb-2">¡Casi listo!</h2>
                <p className="text-lg font-bold text-brand mb-4">Paso Final</p>

                {/* COUNTDOWN */}
                <div className="mb-6 px-4">
                    <p className="text-[13px] text-gray-500 leading-relaxed max-w-xs">
                        Tu lugar está reservado temporalmente. Envía el mensaje de WhatsApp en los próximos{' '}
                        <span className={`font-black text-lg ${isExpired ? 'text-red-500' : 'text-brand'}`}>{formatCountdown(countdown)}</span>{' '}
                        para confirmar tu asistencia y asegurar tu espacio en la agenda.
                    </p>
                </div>

                <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl border-2 border-gray-100 p-6 shadow-sm mb-6 space-y-4">
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
                    {/* MANDATORY WHATSAPP CTA — Validated before render */}
                    {(() => {
                        if (!resolvedWhatsAppPhone) return null;
                        const waUrl = generateWhatsAppReminder(bookingData, resolvedWhatsAppPhone, tenantName || 'Negocio');
                        const isValid = validateWhatsAppLink(waUrl, { staffName: bookingData.staff_name, phone: resolvedWhatsAppPhone });
                        if (!isValid) {
                            return (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                                    <p className="text-red-600 font-bold text-sm">Error generando enlace de WhatsApp.</p>
                                    <p className="text-red-400 text-xs mt-1">Contacta directamente al negocio.</p>
                                </div>
                            );
                        }
                        return (
                            <a 
                                href={waUrl}
                                target="_blank"
                                className={`flex items-center justify-center gap-3 w-full py-5 bg-[#25D366] text-white rounded-2xl font-black text-lg shadow-xl shadow-green-200/60 transition-all hover:scale-[1.03] active:scale-95 ${!isExpired ? 'animate-pulse hover:animate-none' : ''}`}
                            >
                                <MessageCircle size={22} /> Confirmar por WhatsApp
                            </a>
                        );
                    })()}

                    <p className="text-[11px] text-red-500 font-bold px-4 leading-relaxed">
                        ⚠️ Tu cita no será visible para el equipo hasta que envíes este mensaje.
                    </p>

                    {resolvedWhatsAppPhone && (
                        <a
                            href={generateWhatsAppReminder(bookingData, resolvedWhatsAppPhone, tenantName || 'Negocio')}
                            target="_blank"
                            className="text-[11px] text-green-600 font-bold underline underline-offset-2"
                        >
                            ¿No se abre? Toca aquí para reintentar
                        </a>
                    )}
                    
                    <div className="pt-4 border-t border-gray-100">
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenantName || '')}`}
                            target="_blank"
                            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-50 text-gray-500 rounded-xl font-bold text-xs transition-all hover:bg-gray-100 active:scale-95"
                        >
                            <MapPin size={14} /> Ver ubicación en Google Maps
                        </a>
                    </div>
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
        <div className="flex flex-col h-full overflow-hidden">
            {/* PROGRESS HEADER */}
            <div className="px-6 pt-6 pb-3 sticky top-0 z-20 border-b border-zinc-800/60">
                <div className="flex justify-between items-center mb-4">
                    {step > 1 ? (
                        <button onClick={() => setStep(s => s - 1)} className="p-2 -ml-2 hover:bg-zinc-800/50 rounded-full transition-colors">
                            <ChevronLeft size={20} className="text-zinc-400" />
                        </button>
                    ) : <div className="w-9" />}
                    <span className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">Paso {step} de 4</span>
                    <div className="w-9" />
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full rounded-full" 
                        style={{ background: `linear-gradient(90deg, var(--brand-color), var(--brand-color-secondary))` }}
                        initial={{ width: 0 }} 
                        animate={{ width: `${(step / 4) * 100}%` }} 
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }} 
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <AnimatePresence mode="wait">
                    {/* PASO 1: CATEGORÍAS Y SERVICIOS */}
                    {step === 1 && (
                        <motion.section key="step1" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="p-5 space-y-6 pb-24">
                            {!selectedCategory ? (
                                <>
                                    <div className="px-1">
                                        <h2 className="text-2xl font-black text-white leading-tight">¿Qué estás<br />buscando?</h2>
                                        <p className="text-zinc-500 text-sm mt-1.5 font-medium">Elige una categoría para comenzar.</p>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {categoryOrder.map(category => {
                                            const normalized = category.toLowerCase();
                                            let CategoryIcon = LayoutGrid;
                                            let subtitle = "Ver servicios";
                                            
                                            if (normalized.includes('ritual')) {
                                                CategoryIcon = Gem;
                                                subtitle = "Experiencia premium";
                                            } else if (normalized.includes('esencial') || normalized.includes('menu') || normalized.includes('menú')) {
                                                CategoryIcon = Scissors;
                                                subtitle = "Servicios clásicos";
                                            }

                                            return (
                                                <button 
                                                    key={category} 
                                                    onClick={() => setSelectedCategory(category)}
                                                    className="group relative w-full bg-zinc-800/50 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-zinc-600/80 p-5 rounded-2xl transition-all duration-300 text-left flex items-center gap-4 cursor-pointer overflow-hidden"
                                                >
                                                    {/* Subtle gradient glow on hover */}
                                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[var(--brand-color)]/5 via-transparent to-[var(--brand-color-secondary)]/5 pointer-events-none" />
                                                    
                                                    <div className="w-12 h-12 rounded-xl bg-[var(--brand-color)]/10 text-[var(--brand-color)] flex items-center justify-center group-hover:scale-105 group-hover:bg-[var(--brand-color)]/15 transition-all duration-300 relative z-10 shrink-0">
                                                        <CategoryIcon size={22} strokeWidth={1.75} />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 relative z-10 flex-1 min-w-0">
                                                        <span className="font-bold text-white text-[15px] tracking-tight leading-tight truncate">
                                                            {stripEmojis(category)}
                                                        </span>
                                                        <span className="text-[11px] text-zinc-500 font-medium">{subtitle}</span>
                                                    </div>
                                                    <ChevronRight size={16} className="text-zinc-600 group-hover:text-[var(--brand-color)] transition-colors shrink-0 relative z-10" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="px-1 flex items-center justify-between">
                                        <div>
                                            <button 
                                                onClick={() => setSelectedCategory(null)}
                                                className="flex items-center gap-1 text-[10px] font-extrabold text-[var(--brand-color)] uppercase tracking-widest mb-2 hover:opacity-80 transition-opacity"
                                            >
                                                <ChevronLeft size={12} /> Volver
                                            </button>
                                            <h2 className="text-2xl font-black text-white leading-tight">{stripEmojis(selectedCategory || '')}</h2>
                                        </div>
                                    </div>
                                    <div className="space-y-2.5">
                                        {groupedServices[selectedCategory]
                                            .sort((a, b) => {
                                                const orderA = a.order || 99;
                                                const orderB = b.order || 99;
                                                if (orderA !== orderB) return orderA - orderB;
                                                return a.name.localeCompare(b.name);
                                            })
                                            .map((service) => (
                                            <button 
                                                key={service.id} 
                                                onClick={() => { setSelectedService(service); setStep(2); }} 
                                                className="w-full bg-zinc-800/40 hover:bg-zinc-800/70 p-4 rounded-2xl border border-zinc-700/40 hover:border-zinc-600/60 transition-all duration-300 text-left group"
                                            >
                                                <div className="flex justify-between items-center gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-bold text-white text-sm block group-hover:text-[var(--brand-color)] transition-colors truncate">{service.name}</span>
                                                        {service.description && <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed font-medium truncate">{service.description}</p>}
                                                        <span className="text-[11px] text-zinc-600 font-medium flex items-center gap-1.5 mt-2">
                                                            <Clock size={11} className="text-zinc-600" />
                                                            {service.duration_min} min
                                                        </span>
                                                    </div>
                                                    <span className="font-black text-[var(--brand-color)] bg-[var(--brand-color)]/10 px-3.5 py-1.5 rounded-xl text-sm shrink-0 border border-[var(--brand-color)]/15 group-hover:bg-[var(--brand-color)] group-hover:text-white group-hover:border-transparent transition-all">${service.price}</span>
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
                        <motion.section key="step2" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="p-5">
                            <div className="px-1 mb-6">
                                <h2 className="text-2xl font-black text-white">¿Con quién?</h2>
                                <p className="text-zinc-500 text-sm font-medium">Selecciona a tu {staffLabel.toLowerCase()}.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {filteredStaff.map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => { setSelectedStaff(member); setStep(3); }}
                                        className="bg-zinc-800/40 hover:bg-zinc-800/70 p-5 rounded-2xl border border-zinc-700/40 hover:border-zinc-600/60 transition-all text-center flex flex-col items-center gap-3 aspect-square justify-center group cursor-pointer"
                                    >
                                        <div className="w-20 h-20 rounded-full overflow-hidden relative border-[3px] border-zinc-700/50 shadow-lg bg-zinc-800 group-hover:scale-105 transition-transform duration-300 ring-2 ring-transparent group-hover:ring-[var(--brand-color)] group-hover:border-zinc-600">
                                            {member.avatar_url ? (
                                                <Image src={member.avatar_url} alt={member.full_name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-zinc-800 font-bold text-xl">
                                                    {member.full_name[0]}
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-bold text-zinc-300 block truncate w-full px-2 group-hover:text-white transition-colors text-sm">
                                            {member.full_name.split(' ')[0]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* PASO 3: FECHA */}
                    {step === 3 && (
                        <motion.section key="step3" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col h-full">
                            <div className="p-5 pb-2">
                                <h2 className="text-2xl font-black text-white">Agenda</h2>
                                <p className="text-zinc-500 text-sm font-medium">Busca un hueco disponible.</p>
                            </div>
                            <div className="pl-5 py-4 overflow-x-auto hide-scrollbar flex gap-2.5">
                                {dates.map((date, i) => {
                                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                                    return (
                                        <button 
                                            key={i} 
                                            onClick={() => { setSelectedDate(date); setSelectedTime(""); }} 
                                            className={`min-w-[64px] flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${isSelected ? "bg-[var(--brand-color)] text-white border-[var(--brand-color)] shadow-[0_6px_20px_var(--brand-color-secondary-20)] scale-105" : "bg-zinc-800/40 text-zinc-500 border-zinc-700/40 hover:bg-zinc-800/60 hover:border-zinc-600/50 hover:text-zinc-300"}`}
                                        >
                                            <span className="text-[9px] font-bold uppercase mb-0.5">{format(date, 'EEE', { locale: es })}</span>
                                            <span className="text-base font-black">{format(date, 'd')}</span>
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="flex-1 p-5 pt-4 overflow-y-auto min-h-[200px]">
                                {!selectedDate ? (
                                    <div className="text-center py-10 text-zinc-600 font-medium text-sm">Selecciona un día</div>
                                ) : isLoadingSlots ? (
                                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[var(--brand-color)]" size={22} /></div>
                                ) : slots.length === 0 ? (
                                    <div className="text-center py-10 text-zinc-500 font-bold text-sm">No hay horarios disponibles</div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {slots.map((s: any) => (
                                            <button 
                                                key={s.value} 
                                                onClick={() => setSelectedTime(s.value)} 
                                                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${selectedTime === s.value ? "bg-[var(--brand-color)] text-white border-[var(--brand-color)] shadow-[0_4px_12px_var(--brand-color-secondary-20)]" : "bg-zinc-800/30 text-zinc-400 border-zinc-700/30 hover:border-zinc-600/50 hover:bg-zinc-800/50 hover:text-zinc-300"}`}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {selectedTime && (
                                <div className="p-4 border-t border-zinc-800/60 sticky bottom-0 z-10">
                                    <button 
                                        onClick={() => setStep(4)} 
                                        className="w-full py-3.5 rounded-xl font-bold text-white text-sm shadow-[0_6px_20px_var(--brand-color-secondary-20)] hover:scale-[1.01] transition-transform active:scale-95"
                                        style={{ background: `linear-gradient(135deg, var(--brand-color), var(--brand-color-secondary))` }}
                                    >
                                        Continuar
                                    </button>
                                </div>
                            )}
                        </motion.section>
                    )}

                    {/* PASO 4: DATOS CLIENTE */}
                    {step === 4 && (
                        <motion.section key="step4" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="p-5 flex flex-col">
                            <h2 className="text-2xl font-black text-white mb-6">Tus Datos</h2>
                            <div className="space-y-3 flex-1">
                                <div className="relative">
                                    <User size={17} className="absolute left-4 top-[15px] text-zinc-600" />
                                    <input 
                                        type="text" 
                                        value={clientData.name} 
                                        className="w-full pl-11 p-3.5 bg-zinc-800/50 rounded-xl font-bold outline-none border border-zinc-700/40 focus:bg-zinc-800/80 focus:border-[var(--brand-color)]/50 transition-all text-white placeholder-zinc-600 text-sm" 
                                        placeholder="Nombre completo" 
                                        onChange={(e) => setClientData({ ...clientData, name: e.target.value })} 
                                    />
                                </div>
                                <div className="relative">
                                    <Phone size={17} className="absolute left-4 top-[15px] text-zinc-600" />
                                    <input 
                                        type="tel" 
                                        value={clientData.phone} 
                                        className="w-full pl-11 p-3.5 bg-zinc-800/50 rounded-xl font-bold outline-none border border-zinc-700/40 focus:bg-zinc-800/80 focus:border-[var(--brand-color)]/50 transition-all text-white placeholder-zinc-600 text-sm" 
                                        placeholder="WhatsApp (10 dígitos)" 
                                        onChange={(e) => setClientData({ ...clientData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} 
                                    />
                                </div>
                                {!currentUser && (
                                    <div className="relative">
                                        <Mail size={17} className="absolute left-4 top-[15px] text-zinc-600" />
                                        <input 
                                            type="email" 
                                            value={clientData.email} 
                                            className="w-full pl-11 p-3.5 bg-zinc-800/50 rounded-xl font-bold outline-none border border-zinc-700/40 focus:bg-zinc-800/80 focus:border-[var(--brand-color)]/50 transition-all text-white placeholder-zinc-600 text-sm" 
                                            placeholder="Email (opcional)" 
                                            onChange={(e) => setClientData({ ...clientData, email: e.target.value })} 
                                        />
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={handleBooking} 
                                disabled={!clientData.name || clientData.phone.length !== 10 || isSubmitting} 
                                className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-30 mt-6 flex justify-center items-center gap-2 shadow-[0_6px_20px_var(--brand-color-secondary-20)] hover:scale-[1.01] transition-transform active:scale-95 cursor-pointer"
                                style={{ background: `linear-gradient(135deg, var(--brand-color), var(--brand-color-secondary))` }}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Reservar Cita'}
                            </button>
                        </motion.section>
                    )}

                </AnimatePresence>
            </div>

            {/* FOOTER — AUTHOR IDENTITY */}
            <div className="py-4 border-t border-zinc-800/50 flex justify-center items-center">
                <a 
                    href={GLOBAL_BRANDING.SERVICES_URL} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[9px] font-medium tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1.5"
                >
                    <span>Desarrollado por</span>
                    <span className="font-extrabold uppercase text-zinc-500">KEVIN CONSULTING</span>
                    <span className="text-zinc-700">•</span>
                    <span>Potencia tu negocio</span>
                </a>
            </div>
        </div>
    );
}