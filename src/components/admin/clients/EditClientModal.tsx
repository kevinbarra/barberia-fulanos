'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, User, Phone, Check, AlertTriangle, Archive } from 'lucide-react';
import { updateManagedClient, archiveClient } from '@/app/admin/clients/actions';
import { useRouter } from 'next/navigation';

interface EditClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: {
        id: string;
        name: string;
        phone?: string;
    };
    onSuccess: (updatedClient: { id: string; name: string; phone: string }) => void;
    onArchived?: () => void;  // Optional callback when client is archived
}

export default function EditClientModal({ isOpen, onClose, client, onSuccess, onArchived }: EditClientModalProps) {
    const router = useRouter();
    const [name, setName] = useState(client.name);
    const [phone, setPhone] = useState(client.phone || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Credential script state (shown after phone change)
    const [credentialScript, setCredentialScript] = useState<string | null>(null);

    // Archive states
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    // Reset form when client changes
    useEffect(() => {
        setName(client.name);
        setPhone(client.phone || '');
        setError(null);
        setCredentialScript(null);
        setShowArchiveConfirm(false);
    }, [client]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const result = await updateManagedClient(client.id, name, phone);

            if (!result.success) {
                setError(result.message);
                setIsSubmitting(false);
                return;
            }

            // Handle response based on mode
            if (result.mode === 'phone_change' && result.data?.script) {
                // Phone changed - show credential script, don't close yet
                setCredentialScript(result.data.script);
                setIsSubmitting(false);

                // Update parent with new data
                onSuccess({
                    id: client.id,
                    name: result.data.newName,
                    phone: result.data.newPhone
                });
            } else {
                // Name only change - close immediately
                onSuccess({
                    id: client.id,
                    name: result.data?.newName || name,
                    phone: result.data?.newPhone || phone
                });
                onClose();
            }
        } catch {
            setError('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDismissCredentials = () => {
        setCredentialScript(null);
        onClose();
    };

    // Handle archive (soft delete)
    const handleArchive = async () => {
        setIsArchiving(true);
        setError(null);

        try {
            const result = await archiveClient(client.id);

            if (!result.success) {
                setError(result.message);
                setShowArchiveConfirm(false);
                setIsArchiving(false);
                return;
            }

            // Success - refresh data FIRST, then close modal
            router.refresh();

            // Show success feedback
            alert(`✅ ${result.message}`);

            // Close modal and notify parent
            onClose();
            onArchived?.();
        } catch {
            setError('Error de conexión');
            setShowArchiveConfirm(false);
        } finally {
            setIsArchiving(false);
        }
    };

    // Showing credential script after phone change
    if (credentialScript) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                    {/* Header */}
                    <div className="bg-green-600 p-4 text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <Check className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">Cliente Actualizado</h2>
                                <p className="text-green-100 text-sm">Nuevas credenciales generadas</p>
                            </div>
                        </div>
                    </div>

                    {/* Credential Script */}
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
                            onClick={handleDismissCredentials}
                            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Check className="w-5 h-5" />
                            Entendido, ya le dije
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Edit form
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">Editar Cliente</h2>
                            <p className="text-gray-400 text-sm">Corregir nombre o teléfono</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Warning about phone change */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 flex gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Si cambias el teléfono, se generará una nueva contraseña.</span>
                    </div>

                    {/* Name field */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Nombre
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nombre del cliente"
                                required
                                className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Phone field */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Teléfono (10 dígitos)
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="Ej: 2291234567"
                                required
                                maxLength={10}
                                className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            {phone.length}/10 dígitos
                        </p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || phone.length !== 10}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Guardar Cambios'
                            )}
                        </button>
                    </div>
                </form>

                {/* Danger Zone - Archive */}
                <div className="px-6 pb-6">
                    <div className="border-t border-gray-200 pt-4">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Zona de Peligro</p>

                        {!showArchiveConfirm ? (
                            <button
                                type="button"
                                onClick={() => setShowArchiveConfirm(true)}
                                className="w-full py-3 border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Archive className="w-4 h-4" />
                                Archivar Cliente
                            </button>
                        ) : (
                            <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-sm text-red-800 font-medium">
                                    ¿Estás seguro de archivar a <strong>{client.name}</strong>?
                                </p>
                                <p className="text-xs text-red-600">
                                    El cliente se ocultará de las búsquedas, pero su historial de citas permanecerá intacto.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowArchiveConfirm(false)}
                                        disabled={isArchiving}
                                        className="flex-1 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleArchive}
                                        disabled={isArchiving}
                                        className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isArchiving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            'Sí, Archivar'
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
