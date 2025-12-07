'use client';

import { useState } from 'react';
import { UserX, RefreshCw, ShieldAlert, CheckCircle } from 'lucide-react';
import { forgiveNoShow, getNoShowHistory, resetClientWarnings } from '@/app/admin/no-shows/actions';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ClientWarningsTable({ clients, userRole }: { clients: any[], userRole: string }) {
    const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [history, setHistory] = useState<any[]>([]);
    const [isResetting, setIsResetting] = useState(false);

    const loadHistory = async (email: string) => {
        setSelectedEmail(email);
        setHistory([]);
        try {
            const data = await getNoShowHistory(email);
            setHistory(data);
        } catch (error) {
            toast.error("Error al cargar historial");
        }
    };

    const handleForgive = async (noShowId: string) => {
        if (!confirm('¿Perdonar este no-show individual?')) return;

        const result = await forgiveNoShow(noShowId);
        if (result.success) {
            toast.success('No-show perdonado');
            if (selectedEmail) loadHistory(selectedEmail);
        } else {
            toast.error(result.error);
        }
    };

    const handleReset = async (email: string) => {
        if (!confirm('⚠️ ¿Estás seguro de resetear TODOS los warnings de este cliente? Esto borrará su historial negativo reciente.')) return;

        setIsResetting(true);
        const result = await resetClientWarnings(email);
        setIsResetting(false);

        if (result.success) {
            toast.success('Cliente reseteado exitosamente');
            setSelectedEmail(null);
            // Idealmente recargar la página o invalidar datos, pero la server action ya hace revalidatePath
            // Forzamos recarga simple para ver cambios
            window.location.reload();
        } else {
            toast.error(result.error || 'Error al resetear');
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lista de clientes */}
            <div className="space-y-3">
                {clients.length === 0 ? (
                    <div className="text-gray-500 text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2 opacity-50" />
                        <p className="font-medium">¡Excelente!</p>
                        <p className="text-sm">No hay clientes con advertencias activas.</p>
                    </div>
                ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    clients.map((client: any) => (
                        <div
                            key={client.email} // Usamos email como key
                            onClick={() => loadHistory(client.email)}
                            className={`
                p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group
                ${client.warning_level === 'blocked'
                                    ? 'bg-red-50 border-red-200 hover:border-red-300'
                                    : client.warning_level === 'warning'
                                        ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                                        : 'bg-white border-gray-200 hover:border-blue-300'}
                ${selectedEmail === client.email ? 'ring-2 ring-offset-2 ring-blue-500 shadow-md' : ''}
                `}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                            ${client.warning_level === 'blocked' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}
                        `}>
                                        {client.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900">{client.full_name}</h3>
                                            {client.warning_level === 'blocked' && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded-full tracking-wider">Vetado</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium">{client.email}</p>
                                    </div>
                                </div>

                                <div className="text-center min-w-[60px]">
                                    <span className={`block text-2xl font-black ${client.warning_level === 'blocked' ? 'text-red-500' : 'text-orange-500'}`}>
                                        {client.total_no_shows}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Faltas</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Panel de Detalles */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[500px] sticky top-6">
                {selectedEmail ? (
                    <>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                            <div>
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-gray-500" />
                                    Historial de Faltas
                                </h3>
                                <p className="text-xs text-gray-500">{selectedEmail}</p>
                            </div>

                            {(userRole === 'admin' || userRole === 'owner') && (
                                <button
                                    onClick={() => handleReset(selectedEmail)}
                                    disabled={isResetting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-600 rounded-lg text-xs font-bold transition-all shadow-sm"
                                >
                                    {isResetting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    Resetear Cliente
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                                    <RefreshCw className="w-8 h-8 mb-2 animate-spin" />
                                    <p className="text-sm">Cargando...</p>
                                </div>
                            ) : (
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                history.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className={`
                        p-4 rounded-xl border relative
                        ${item.forgiven ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-100 shadow-sm'}
                        `}
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-gray-900 text-sm">
                                                        {new Date(item.marked_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-xs font-medium text-gray-500">
                                                        {new Date(item.marked_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-2">"{item.reason}"</p>

                                                {item.forgiven ? (
                                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-[10px] font-bold uppercase">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Perdonado
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold uppercase">
                                                        <UserX className="w-3 h-3" />
                                                        Falta Activa
                                                    </div>
                                                )}
                                            </div>

                                            {!item.forgiven && (
                                                <button
                                                    onClick={() => handleForgive(item.id)}
                                                    className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors shadow-lg shadow-gray-200"
                                                >
                                                    Perdonar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <UserX className="w-10 h-10 opacity-20" />
                        </div>
                        <p className="font-medium text-gray-400">Selecciona un cliente</p>
                        <p className="text-sm text-gray-400">para ver su historial detallado</p>
                    </div>
                )}
            </div>
        </div>
    );
}
