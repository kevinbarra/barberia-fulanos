'use client';

import { useState } from 'react';
import { X, Loader2, User, Phone, Check, UserPlus, Mail } from 'lucide-react';
import { createManagedClient } from '@/app/admin/clients/actions';
import { useRouter } from 'next/navigation';

// Simple email validation
const isValidEmail = (email: string) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

interface CreateClientModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateClientModal({ isOpen, onClose }: CreateClientModalProps) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');  // Optional contact email
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credentialScript, setCredentialScript] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            // Simple email validation if provided
            if (email && !isValidEmail(email)) {
                setError('El formato del correo no es válido');
                setIsSubmitting(false);
                return;
            }

            // Create Shadow Profile with optional email
            const result = await createManagedClient(name, phone, email || undefined);

            if (!result.success) {
                setError(result.message || 'Error al crear cliente');
                setIsSubmitting(false);
                return;
            }

            // Éxito: Mostrar script de credenciales
            if (result.data?.script) {
                setCredentialScript(result.data.script);
                setIsSubmitting(false);
                // No cerramos el modal aún, esperamos a que el admin lea el script
                router.refresh(); // Refrescamos la lista de fondo
            } else {
                // Fallback si no hay script (raro)
                onClose();
                router.refresh();
            }
        } catch {
            setError('Error de conexión');
            setIsSubmitting(false);
        }
    };

    const handleDismiss = () => {
        setCredentialScript(null);
        setName('');
        setPhone('');
        setEmail('');
        onClose();
    };

    // MODO ÉXITO: Mostrar Credenciales
    if (credentialScript) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                    <div className="bg-green-600 p-4 text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Check className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">¡Cliente Creado!</h2>
                            <p className="text-green-100 text-sm">Perfil activo y listo.</p>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl mb-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                    <Phone className="w-4 h-4 text-amber-700" />
                                </div>
                                <div>
                                    <p className="font-bold text-amber-800 mb-2">📢 Léale esto al cliente:</p>
                                    <p className="text-amber-900 text-sm leading-relaxed">{credentialScript}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                        >
                            ✓ Entendido, cerrar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // MODO FORMULARIO
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">Nuevo Cliente</h2>
                            <p className="text-gray-400 text-sm">Registrar en base de datos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nombre Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Juan Pérez"
                                required
                                autoFocus
                                className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Teléfono (10 dígitos)</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="Ej: 5512345678"
                                required
                                maxLength={10}
                                className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{phone.length}/10 dígitos</p>
                    </div>
                    {/* Optional Email */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Email <span className="text-gray-300 font-normal">(Opcional)</span>
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="cliente@ejemplo.com"
                                className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        {email && !isValidEmail(email) && (
                            <p className="text-xs text-red-500 mt-1">Formato de correo inválido</p>
                        )}
                    </div>
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            {error}
                        </div>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSubmitting || phone.length !== 10 || !name.trim() || (!!email && !isValidEmail(email))} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registrar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
