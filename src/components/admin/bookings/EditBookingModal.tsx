'use client';

import { useState } from 'react';
import { X, Calendar, Clock, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { rescheduleBooking } from '@/app/admin/bookings/actions';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

type StaffMember = {
    id: string;
    full_name: string;
};

type EditBookingModalProps = {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    currentDate: string; // ISO string
    currentStaffId: string;
    currentStaffName: string;
    serviceName: string;
    clientName: string;
    staff: StaffMember[];
    onSuccess: (dateFormatted: string, timeFormatted: string) => void;
};

export default function EditBookingModal({
    isOpen,
    onClose,
    bookingId,
    currentDate,
    currentStaffId,
    currentStaffName,
    serviceName,
    clientName,
    staff,
    onSuccess,
}: EditBookingModalProps) {
    // Parse current booking date into local date/time inputs
    const currentLocalDate = new Date(currentDate);
    const dateDefault = format(currentLocalDate, 'yyyy-MM-dd');
    const timeDefault = format(currentLocalDate, 'HH:mm');

    const [selectedDate, setSelectedDate] = useState(dateDefault);
    const [selectedTime, setSelectedTime] = useState(timeDefault);
    const [selectedStaffId, setSelectedStaffId] = useState(currentStaffId);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    // Generate time slots (8:00 - 21:00 every 30 min)
    const timeSlots: string[] = [];
    for (let h = 8; h <= 21; h++) {
        timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < 21) timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
    }

    // Min date: today
    const minDate = format(new Date(), 'yyyy-MM-dd');
    // Max date: 30 days from now
    const maxDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

    const handleSubmit = async () => {
        if (!selectedDate || !selectedTime) {
            toast.error('Selecciona fecha y hora.');
            return;
        }

        setIsSubmitting(true);

        // Build CDMX local datetime string
        const newStartTime = `${selectedDate}T${selectedTime}`;
        const newStaffId = selectedStaffId !== currentStaffId ? selectedStaffId : undefined;

        const result = await rescheduleBooking(bookingId, newStartTime, newStaffId);

        setIsSubmitting(false);

        if (result.error) {
            toast.error(result.error);
            return;
        }

        toast.success('✅ Cita reprogramada');
        onClose();
        onSuccess(result.dateFormatted || '', result.timeFormatted || '');
    };

    const hasChanges = selectedDate !== dateDefault || selectedTime !== timeDefault || selectedStaffId !== currentStaffId;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                        <div>
                            <h3 className="text-lg font-black text-gray-900">Reprogramar Cita</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{clientName} — {serviceName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <X size={18} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="p-5 space-y-4">
                        {/* Date Picker */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                <Calendar size={12} className="inline mr-1" />
                                Nueva Fecha
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                min={minDate}
                                max={maxDate}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-black/10 focus:border-gray-300 transition-all"
                            />
                        </div>

                        {/* Time Picker */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                <Clock size={12} className="inline mr-1" />
                                Nueva Hora
                            </label>
                            <select
                                value={selectedTime}
                                onChange={e => setSelectedTime(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-black/10 focus:border-gray-300 transition-all bg-white"
                            >
                                {timeSlots.map(slot => (
                                    <option key={slot} value={slot}>
                                        {slot}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Staff Picker */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                <User size={12} className="inline mr-1" />
                                Barbero
                            </label>
                            <select
                                value={selectedStaffId}
                                onChange={e => setSelectedStaffId(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-black/10 focus:border-gray-300 transition-all bg-white"
                            >
                                {staff.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-5 pt-0 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !hasChanges}
                            className="flex-1 py-3 text-sm font-bold text-white bg-black hover:bg-zinc-800 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Guardar Cambio'
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
