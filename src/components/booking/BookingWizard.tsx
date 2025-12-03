"use client";

import { useState, useEffect, useMemo } from "react";
import { createBooking, getTakenSlots } from "@/app/book/[slug]/actions";
import { format, toZonedTime } from 'date-fns-tz';
import { Loader2 } from "lucide-react";
import Image from 'next/image';

type Service = {
    id: string;
    name: string;
    price: number;
    duration_min: number;
    tenant_id: string;
    category?: string;
};
type Staff = { id: string; full_name: string; role: string; avatar_url: string | null };
type Schedule = { staff_id: string; day: string; start_time: string; end_time: string };

const TIMEZONE = 'America/Mexico_City';

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
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [success, setSuccess] = useState(false);

    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [takenTimes, setTakenTimes] = useState<string[]>([]);
    const [clientData, setClientData] = useState({ name: "", phone: "", email: "" });

    useEffect(() => {
        let isMounted = true;
        async function fetchSlots() {
            if (selectedDate && selectedStaff) {
                setIsLoadingSlots(true);
                try {
                    const taken = await getTakenSlots(selectedStaff.id, selectedDate);
                    if (isMounted) setTakenTimes(taken);
                } catch (error) {
                    console.error("Error fetching slots", error);
                } finally {
                    if (isMounted) setIsLoadingSlots(false);
                }
            }
        }
        fetchSlots();
        return () => { isMounted = false; };
    }, [selectedDate, selectedStaff]);

    const groupedServices = useMemo(() => {
        return services.reduce((acc, service) => {
            const cat = service.category || 'General';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
        }, {} as Record<string, Service[]>);
    }, [services]);

    const categoryOrder = ['Cortes', 'Barba', 'Cejas', 'Paquetes', 'Extras', 'General'];

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
            const timeString = currentTime.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            const isTaken = takenTimes.some(isoTaken => {
                const takenDate = toZonedTime(isoTaken, TIMEZONE);
                const takenTimeString = format(takenDate, 'HH:mm', { timeZone: TIMEZONE });
                return takenTimeString === timeString;
            });

            if (!isTaken) {
                generatedSlots.push(timeString);
            }

            currentTime.setMinutes(currentTime.getMinutes() + 30);
        }
        return generatedSlots;
    }, [selectedDate, selectedStaff, schedules, takenTimes]);

    const handleBooking = async () => {
        if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return;
        setIsSubmitting(true);
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
        if (result.success) setSuccess(true);
        else alert(result.error || "Error al reservar");
    };

    if (success) {
        return (
            <div className="text-center py-10 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-4xl">🎉</span></div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Cita Confirmada!</h2>
                <p className="text-gray-600 mb-6">Te esperamos el {selectedDate} a las {selectedTime}</p>
                <button onClick={() => window.location.reload()} className="text-black underline">Volver al inicio</button>
            </div>
        );
    }

    if (step === 1) {
        return (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                <h2 className="text-lg font-semibold mb-6 text-gray-900">Selecciona un servicio</h2>
                <div className="space-y-8">
                    {categoryOrder.map(category => {
                        const items = groupedServices[category];
                        if (!items || items.length === 0) return null;
                        return (
                            <div key={category}>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">{category}</h3>
                                <div className="space-y-3">
                                    {items.map((service) => (
                                        <button key={service.id} onClick={() => { setSelectedService(service); setStep(2); }} className="w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center hover:border-black hover:ring-1 hover:ring-black transition-all group text-left">
                                            <div><span className="font-semibold text-gray-900 block group-hover:text-black">{service.name}</span><span className="text-sm text-gray-500">{service.duration_min} min</span></div>
                                            <div className="font-bold text-gray-900">${service.price}</div>
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

    if (step === 2) {
        return (
            <section className="animate-in fade-in slide-in-from-right-8 duration-300">
                <button onClick={() => setStep(1)} className="text-sm text-gray-500 mb-4 hover:underline">← Volver</button>
                <h2 className="text-lg font-semibold mb-2 text-gray-800">2. ¿Quién te atiende?</h2>
                <div className="grid grid-cols-2 gap-3">
                    {staff.map((member) => (
                        <button key={member.id} onClick={() => { setSelectedStaff(member); setStep(3); }} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-black hover:ring-1 hover:ring-black transition-all text-left group flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 mb-3 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-100 group-hover:border-black transition-colors relative">
                                {member.avatar_url ? <Image src={member.avatar_url} alt={member.full_name} width={64} height={64} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl bg-gray-200">{member.full_name.charAt(0)}</div>}
                            </div>
                            <span className="font-semibold text-gray-900 block truncate w-full text-sm">{member.full_name}</span>
                            <span className="text-xs text-gray-500 capitalize block">{member.role === 'owner' ? 'Barbero Senior' : 'Staff'}</span>
                        </button>
                    ))}
                </div>
            </section>
        );
    }

    if (step === 3) {
        return (
            <section className="animate-in fade-in slide-in-from-right-8 duration-300">
                <button onClick={() => setStep(2)} className="text-sm text-gray-500 mb-4 hover:underline">← Volver</button>
                <h2 className="text-lg font-semibold mb-2 text-gray-800">3. Fecha y Hora</h2>
                <input type="date" className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:ring-black focus:border-black" min={new Date().toISOString().split('T')[0]} onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); }} />
                {selectedDate ? (
                    isLoadingSlots ? <div className="flex justify-center py-8 text-gray-400"><Loader2 className="animate-spin" /></div> : (
                        <div className="grid grid-cols-3 gap-2">
                            {slots.length === 0 ? <p className="col-span-3 text-center py-4 bg-gray-50 rounded-lg text-gray-500 text-sm">No hay horarios disponibles.</p> : slots.map((time) => (
                                <button key={time} onClick={() => setSelectedTime(time)} className={`py-2 px-1 rounded-lg text-sm font-medium border ${selectedTime === time ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"}`}>{time}</button>
                            ))}
                        </div>
                    )
                ) : <p className="text-sm text-gray-400 text-center">Selecciona un día.</p>}
                {selectedTime && <button onClick={() => setStep(4)} className="w-full mt-6 bg-black text-white py-3 rounded-xl font-bold">Continuar</button>}
            </section>
        );
    }

    if (step === 4) {
        return (
            <section className="animate-in fade-in slide-in-from-right-8 duration-300">
                <button onClick={() => setStep(3)} className="text-sm text-gray-500 mb-4 hover:underline">← Volver</button>
                <h2 className="text-lg font-semibold mb-2 text-gray-800">4. Tus Datos</h2>
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700">Nombre completo</label><input type="text" required className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black" onChange={(e) => setClientData({ ...clientData, name: e.target.value })} /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Teléfono</label><input type="tel" required className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black" onChange={(e) => setClientData({ ...clientData, phone: e.target.value })} /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Correo (Opcional)</label><input type="email" className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black" onChange={(e) => setClientData({ ...clientData, email: e.target.value })} /></div>
                </div>
                <button onClick={handleBooking} disabled={!clientData.name || !clientData.phone || isSubmitting} className="w-full mt-8 bg-black text-white py-3 rounded-xl font-bold text-lg hover:bg-gray-800 disabled:opacity-50 flex justify-center items-center">{isSubmitting ? <Loader2 className="animate-spin" /> : "Confirmar Reserva"}</button>
            </section>
        );
    }
    return null;
}