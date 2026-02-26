'use client';

import { X, MessageCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type WhatsAppNotifyModalProps = {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    clientPhone: string | null;
    variant: 'reschedule' | 'cancel';
    dateFormatted?: string;
    timeFormatted?: string;
};

function cleanPhoneForWa(phone: string): string {
    // Remove spaces, dashes, parentheses, plus sign
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    // If starts with "52" already, use as-is; otherwise prepend 52 (Mexico)
    if (!cleaned.startsWith('52') && cleaned.length === 10) {
        cleaned = '52' + cleaned;
    }
    return cleaned;
}

export default function WhatsAppNotifyModal({
    isOpen,
    onClose,
    clientName,
    clientPhone,
    variant,
    dateFormatted,
    timeFormatted,
}: WhatsAppNotifyModalProps) {
    if (!isOpen) return null;

    const firstName = clientName?.split(' ')[0] || 'Cliente';

    const message = variant === 'reschedule'
        ? `Hola ${firstName}, te informo que tu cita ha sido reprogramada para el ${dateFormatted || ''} a las ${timeFormatted || ''}. ¿Te parece bien?`
        : `Hola ${firstName}, lamento informarte que tu cita para el ${dateFormatted || ''} ha sido cancelada. Por favor, agenda una nueva cuando gustes en nuestra página.`;

    const waUrl = clientPhone
        ? `https://wa.me/${cleanPhoneForWa(clientPhone)}?text=${encodeURIComponent(message)}`
        : null;

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
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Success Header */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center border-b border-green-100">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-200">
                            <CheckCircle2 size={32} className="text-white" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">
                            {variant === 'reschedule' ? '¡Cita Reprogramada!' : '¡Cita Cancelada!'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {variant === 'reschedule'
                                ? 'La cita ha sido movida exitosamente.'
                                : 'La cita ha sido cancelada y el horario liberado.'}
                        </p>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-600 text-center">
                            Avísale al cliente por WhatsApp:
                        </p>

                        {/* Message Preview */}
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
                        </div>

                        {/* WhatsApp Button */}
                        {waUrl ? (
                            <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] hover:bg-[#1fba59] text-white rounded-2xl font-black text-sm uppercase tracking-wide transition-all active:scale-[0.97] shadow-lg shadow-green-200/50"
                            >
                                <MessageCircle size={20} />
                                {variant === 'reschedule' ? 'NOTIFICAR CAMBIO' : 'AVISAR CANCELACIÓN'}
                            </a>
                        ) : (
                            <div className="text-center text-sm text-gray-400 py-3 bg-gray-50 rounded-xl">
                                Sin teléfono registrado para este cliente
                            </div>
                        )}

                        {/* Close */}
                        <button
                            onClick={onClose}
                            className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
                        >
                            Cerrar sin notificar
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
