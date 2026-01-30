'use client';

import { useState } from 'react';
import { Search, User, Phone, Trophy, Calendar, Pencil, UserPlus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import EditClientModal from './EditClientModal';
import type { ClientListItem } from '@/app/admin/clients/actions';

interface AllClientsTableProps {
    clients: ClientListItem[];
    isArchivedView?: boolean;
}

export default function AllClientsTable({ clients: initialClients, isArchivedView = false }: AllClientsTableProps) {
    const [clients, setClients] = useState(initialClients);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingClient, setEditingClient] = useState<{ id: string; name: string; phone?: string; isArchived?: boolean } | null>(null);

    // Filter clients locally
    const filteredClients = clients.filter(client => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            client.full_name.toLowerCase().includes(query) ||
            (client.phone && client.phone.includes(query))
        );
    });

    const handleEditSuccess = (updated: { id: string; name: string; phone: string }) => {
        // Update client in list
        setClients(prev => prev.map(c =>
            c.id === updated.id
                ? { ...c, full_name: updated.name, phone: updated.phone }
                : c
        ));
        setEditingClient(null);
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'Sin visitas';
        try {
            return format(new Date(dateStr), "d MMM yyyy", { locale: es });
        } catch {
            return 'Sin visitas';
        }
    };

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o teléfono..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
            </div>

            {/* Stats Bar */}
            <div className="flex gap-4 text-sm">
                <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium">
                    {filteredClients.length} clientes
                </div>
                <div className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg font-medium">
                    {clients.reduce((sum, c) => sum + c.loyalty_points, 0).toLocaleString()} puntos totales
                </div>
            </div>

            {/* Clients List */}
            {filteredClients.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <UserPlus className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-bold text-gray-400">
                        {searchQuery ? 'Sin resultados' : 'No hay clientes registrados'}
                    </p>
                    <p className="text-sm text-gray-400">
                        {searchQuery ? 'Intenta con otro término' : 'Los clientes aparecerán aquí al registrarse'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-4">Cliente</div>
                        <div className="col-span-2">Teléfono</div>
                        <div className="col-span-2">Puntos</div>
                        <div className="col-span-2">Última Visita</div>
                        <div className="col-span-2 text-right">Acciones</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-50">
                        {filteredClients.map((client) => (
                            <div
                                key={client.id}
                                className="px-4 md:px-6 py-4 hover:bg-gray-50/50 transition-colors md:grid md:grid-cols-12 md:gap-4 md:items-center space-y-2 md:space-y-0"
                            >
                                {/* Name */}
                                <div className="col-span-4 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="font-bold text-blue-600 text-sm">
                                            {client.full_name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-900 truncate">{client.full_name}</p>
                                        <p className="text-xs text-gray-400 md:hidden flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {client.phone || 'Sin teléfono'}
                                        </p>
                                    </div>
                                </div>

                                {/* Phone - Desktop */}
                                <div className="hidden md:flex col-span-2 items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    {client.phone ? (
                                        <span className="font-mono">{client.phone}</span>
                                    ) : (
                                        <span className="text-gray-400 italic">N/A</span>
                                    )}
                                </div>

                                {/* Points */}
                                <div className="col-span-2 hidden md:flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                    <span className="font-bold text-amber-600">{client.loyalty_points}</span>
                                </div>

                                {/* Last Visit */}
                                <div className="col-span-2 hidden md:flex items-center gap-2 text-sm text-gray-500">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span>{formatDate(client.last_visit)}</span>
                                </div>

                                {/* Actions */}
                                <div className="col-span-2 flex justify-end gap-2">
                                    {/* Mobile Stats */}
                                    <div className="md:hidden flex items-center gap-3 flex-1">
                                        <div className="flex items-center gap-1 text-amber-600">
                                            <Trophy className="w-4 h-4" />
                                            <span className="font-bold text-sm">{client.loyalty_points}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setEditingClient({
                                            id: client.id,
                                            name: client.full_name,
                                            phone: client.phone || undefined,
                                            isArchived: isArchivedView
                                        })}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Editar cliente"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingClient && (
                <EditClientModal
                    isOpen={true}
                    onClose={() => setEditingClient(null)}
                    client={editingClient}
                    onSuccess={handleEditSuccess}
                    isArchived={editingClient.isArchived}
                />
            )}
        </div>
    );
}
