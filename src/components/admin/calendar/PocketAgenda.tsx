'use client';

import { PosBookingData } from '@/types/supabase-joined';
import { useState, useMemo, useEffect, useRef } from 'react';
import { isSameDay, isAfter, isBefore, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
    bookings: PosBookingData[];
    staff: any[];
    services: any[];
}

export default function PocketAgenda({ bookings, staff, services }: Props) {
    const now = new Date();
    const [selectedDate, setSelectedDate] = useState(startOfDay(now));
    const scrollRef = useRef<HTMLDivElement>(null);

    const isToday = isSameDay(selectedDate, now);
    const isPast = isBefore(selectedDate, startOfDay(now));

    // Generar días de la semana actual para el Week Strip
    const weekDays = useMemo(() => {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [selectedDate]);

    const { current, next } = useMemo(() => {
        if (!isToday) return { current: null, next: null };

        let currentBooking: PosBookingData | null = null;
        let nextBooking: PosBookingData | null = null;

        const dateBookings = bookings
            .filter(b => isSameDay(toZonedTime(b.start_time, DEFAULT_TIMEZONE), selectedDate))
            .filter(b => ['pending', 'confirmed', 'seated'].includes(b.status))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        for (const b of dateBookings) {
            const start = toZonedTime(b.start_time, DEFAULT_TIMEZONE);
            const end = toZonedTime(b.end_time, DEFAULT_TIMEZONE);

            if (isBefore(start, now) && isAfter(end, now)) {
                if (!currentBooking) currentBooking = b;
            } else if (isAfter(start, now)) {
                if (!nextBooking) nextBooking = b;
            }
        }

        return { current: currentBooking, next: nextBooking };
    }, [bookings, selectedDate, now]);

    const dailyBookings = useMemo(() => {
        return bookings
            .filter(b => isSameDay(toZonedTime(b.start_time, DEFAULT_TIMEZONE), selectedDate))
            .filter(b => b.id !== current?.id && b.id !== next?.id)
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }, [bookings, selectedDate, current, next]);

    const formatTime = (iso: string) => {
        return toZonedTime(iso, DEFAULT_TIMEZONE).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    const getClientName = (b: PosBookingData) => b.guest_name || b.customer?.full_name || 'Cliente';

    return (
        <div className="p-0 h-full flex flex-col bg-gray-50 overflow-hidden">
            {/* HEADER DE NAVEGACIÓN */}
            <div className="bg-white px-6 pt-8 pb-4 shadow-sm border-b border-gray-100 z-10">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-black text-gray-900">Agenda de Bolsillo</h2>
                    <button
                        onClick={() => setSelectedDate(startOfDay(now))}
                        className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-all ${isToday ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white shadow-md shadow-blue-200'}`}
                    >
                        Hoy
                    </button>
                </div>
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 active:scale-95 transition-all">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1 text-center">
                        <p className="text-sm font-bold text-gray-900 capitalize italic">
                            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                        </p>
                    </div>
                    <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 active:scale-95 transition-all">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* WEEK STRIP */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1" ref={scrollRef}>
                    {weekDays.map((day, idx) => {
                        const isSel = isSameDay(day, selectedDate);
                        const isDayToday = isSameDay(day, now);
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(startOfDay(day))}
                                className={`flex flex-col items-center min-w-[48px] py-3 rounded-2xl transition-all active:scale-90 ${isSel
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-blue-100'
                                    : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
                                    }`}
                            >
                                <span className={`text-[10px] font-bold uppercase tracking-tighter mb-1 ${isSel ? 'text-blue-100' : 'text-gray-400'}`}>
                                    {format(day, 'EEE', { locale: es }).substring(0, 3)}
                                </span>
                                <span className={`text-sm font-black ${isDayToday && !isSel ? 'text-blue-600' : ''}`}>
                                    {format(day, 'd')}
                                </span>
                                {isDayToday && isSel && <div className="w-1 h-1 rounded-full bg-white mt-1"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-24">
                {/* Cita Actual y Siguiente (Solo si es HOY) */}
                {isToday && (
                    <>
                        <div className="bg-black p-6 rounded-3xl text-white shadow-xl relative overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[0.98] active:scale-[0.95]">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Cita Actual
                            </p>
                            {current ? (
                                <>
                                    <h3 className="text-3xl font-black mb-1">{getClientName(current)}</h3>
                                    <p className="text-gray-300 font-medium mb-4">{current.services?.name}</p>
                                    <div className="flex justify-between items-end border-t border-white/10 pt-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Horario</p>
                                            <p className="font-bold text-lg">{formatTime(current.start_time)} - {formatTime(current.end_time)}</p>
                                        </div>
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">En Progreso</span>
                                    </div>
                                </>
                            ) : (
                                <div className="py-2">
                                    <h3 className="text-xl font-bold text-gray-400 mb-1">Sin cita actual</h3>
                                    <p className="text-gray-500 text-sm">Libre en este momento.</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[0.98] active:scale-[0.95] hover:shadow-md">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Siguiente Cita
                            </p>
                            {next ? (
                                <>
                                    <h3 className="text-2xl font-black text-gray-900 mb-1">{getClientName(next)}</h3>
                                    <p className="text-gray-500 font-medium mb-4">{next.services?.name}</p>
                                    <div className="flex justify-between items-end border-t border-gray-50 pt-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Inicia a las</p>
                                            <p className="font-bold text-gray-900 text-lg">{formatTime(next.start_time)}</p>
                                        </div>
                                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{next.profiles?.full_name?.split(' ')[0]}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="py-2">
                                    <h3 className="text-lg font-bold text-gray-400 mb-1">No hay más citas</h3>
                                    <p className="text-gray-400 text-sm">Has terminado por hoy.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Lista de citas del día seleccionado */}
                <div className="pt-2">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2 flex items-center justify-between">
                        <span>{isToday ? 'Resto del Día' : 'Agenda del Día'}</span>
                        <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{dailyBookings.length} citas</span>
                    </h3>
                    <div className="space-y-3">
                        {dailyBookings.length > 0 ? (
                            dailyBookings.map(b => (
                                <div key={b.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-200 cursor-pointer hover:scale-[0.98] active:scale-[0.95] hover:shadow-md group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1 h-8 rounded-full bg-gray-100 group-hover:bg-blue-200 transition-colors"></div>
                                        <div>
                                            <p className="font-black text-gray-900">{getClientName(b)}</p>
                                            <p className="text-xs text-gray-500 font-medium">{b.services?.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-gray-900 text-lg">{formatTime(b.start_time)}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{b.profiles?.full_name?.split(' ')[0]}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-gray-100/50 border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center">
                                <CalendarIcon className="mx-auto text-gray-300 mb-4" size={32} />
                                <p className="text-gray-400 font-bold">Sin citas programadas</p>
                                <p className="text-xs text-gray-300 mt-1 italic">Este día parece estar tranquilo.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
