'use client';

import { useState } from 'react';
import { UserX } from 'lucide-react';
import { forgiveNoShow, getNoShowHistory } from '@/app/admin/no-shows/actions';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ClientWarningsTable({ clients }: { clients: any[] }) {
    const [selectedClient, setSelectedClient] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [history, setHistory] = useState<any[]>([]);

    const loadHistory = async (clientId: string) => {
        const data = await getNoShowHistory(clientId);
        setHistory(data);
        setSelectedClient(clientId);
    };

    const handleForgive = async (noShowId: string) => {
        if (!confirm('¿Perdonar este no-show?')) return;

        const result = await forgiveNoShow(noShowId);
        if (result.success) {
            toast.success('No-show perdonado');
            if (selectedClient) loadHistory(selectedClient);
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lista de clientes */}
            <div className="space-y-2">
                {clients.length === 0 ? (
                    <div className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">No hay clientes con advertencias.</div>
                ) : (
                    clients.map((client: any) => (
                        <div
                            key={client.id}
                            onClick={() => loadHistory(client.id)}
                            className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${client.warning_level === 'blocked' ? 'border-red-500 bg-red-50' :
                                    client.warning_level === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                                        'border-gray-200 bg-white'}
                ${selectedClient === client.id ? 'ring-2 ring-blue-500' : ''}
                `}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-900">{client.full_name}</h3>
                                    <p className="text-sm text-gray-600">{client.email}</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-red-600 font-bold justify-end">
                                        <UserX className="w-5 h-5" />
                                        {client.no_show_count}
                                    </div>
                                    <p className="text-xs text-gray-500">no-shows</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Historial del cliente seleccionado */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 min-h-[300px]">
                {selectedClient ? (
                    <div className="space-y-3">
                        <h3 className="font-bold text-lg mb-4 text-gray-900">Historial de No-Shows</h3>
                        {history.length === 0 ? (
                            <p className="text-gray-500 text-sm">No se encontró historial.</p>
                        ) : (
                            history.map((item) => (
                                <div
                                    key={item.id}
                                    className={`
                    p-4 rounded-lg border
                    ${item.forgiven ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}
                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">
                                                {new Date(item.marked_at).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1 italic">"{item.reason}"</p>
                                            {item.forgiven && (
                                                <p className="text-xs text-green-600 mt-2 font-medium">
                                                    ✓ Perdonado por {item.forgiven_by_profile?.full_name}
                                                </p>
                                            )}
                                        </div>
                                        {!item.forgiven && (
                                            <button
                                                onClick={() => handleForgive(item.id)}
                                                className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 font-medium transition-colors"
                                            >
                                                Perdonar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <UserX className="w-12 h-12 mb-3 opacity-20" />
                        <p>Selecciona un cliente para ver su historial</p>
                    </div>
                )}
            </div>
        </div>
    );
}
