'use client';

import { PosBookingData } from '@/types/supabase-joined';
import { useMemo } from 'react';
import { isSameDay, isAfter, isBefore } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

interface Props {
    bookings: PosBookingData[];
    staff: any[];
    services: any[];
}

export default function PocketAgenda({ bookings, staff, services }: Props) {
    const now = new Date();

    const { current, next } = useMemo(() => {
        let currentBooking: PosBookingData | null = null;
        let nextBooking: PosBookingData | null = null;

        const todayBookings = bookings
            .filter(b => isSameDay(toZonedTime(b.start_time, DEFAULT_TIMEZONE), now))
            .filter(b => ['pending', 'confirmed', 'seated'].includes(b.status))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        for (const b of todayBookings) {
            const start = toZonedTime(b.start_time, DEFAULT_TIMEZONE);
            const end = toZonedTime(b.end_time, DEFAULT_TIMEZONE);

            if (isBefore(start, now) && isAfter(end, now)) {
                if (!currentBooking) currentBooking = b;
            } else if (isAfter(start, now)) {
                if (!nextBooking) nextBooking = b;
            }
        }

        return { current: currentBooking, next: nextBooking };
    }, [bookings, now]);

    const formatTime = (iso: string) => {
        return toZonedTime(iso, DEFAULT_TIMEZONE).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    const getClientName = (b: PosBookingData) => b.guest_name || b.customer?.full_name || 'Cliente';

    return (
        <div className="p-4 h-full flex flex-col bg-gray-50 overflow-hidden">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Agenda de Bolsillo</h2>

            <div className="flex-1 space-y-4 overflow-y-auto pb-20">
                {/* Cita Actual */}
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
                        <div className="py-4">
                            <h3 className="text-xl font-bold text-gray-400 mb-1">Sin cita actual</h3>
                            <p className="text-gray-500 text-sm">Libre en este momento.</p>
                        </div>
                    )}
                </div>

                {/* Siguiente Cita */}
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
                        <div className="py-4">
                            <h3 className="text-lg font-bold text-gray-400 mb-1">No hay más citas</h3>
                            <p className="text-gray-400 text-sm">Has terminado por hoy.</p>
                        </div>
                    )}
                </div>

                {/* Todas las citas del dia */}
                <div className="pt-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Resto del Día</h3>
                    <div className="space-y-3">
                        {bookings
                            .filter(b => isSameDay(toZonedTime(b.start_time, DEFAULT_TIMEZONE), now))
                            .filter(b => b.id !== current?.id && b.id !== next?.id)
                            .filter(b => ['pending', 'confirmed'].includes(b.status))
                            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                            .slice(0, 5)
                            .map(b => (
                                <div key={b.id} className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between transition-all duration-200 cursor-pointer hover:scale-[0.98] active:scale-[0.95] hover:shadow-md">
                                    <div>
                                        <p className="font-bold text-gray-900">{getClientName(b)}</p>
                                        <p className="text-xs text-gray-500">{b.services?.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">{formatTime(b.start_time)}</p>
                                        <p className="text-[10px] text-gray-400 bg-gray-100 inline-block px-1.5 rounded">{b.profiles?.full_name?.split(' ')[0]}</p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
