'use client';

import { useState } from 'react';
import { Users, AlertTriangle, UserPlus, Archive } from 'lucide-react';
import AllClientsTable from './AllClientsTable';
import ClientWarningsTable from '@/components/admin/ClientWarningsTable';
import CreateClientModal from './CreateClientModal';
import type { ClientListItem } from '@/app/admin/clients/actions';

interface ClientsPageTabsProps {
    allClients: ClientListItem[];
    archivedClients: ClientListItem[];
    warningClients: any[];
    userRole: string;
}

type TabView = 'all' | 'archived' | 'warnings';

export default function ClientsPageTabs({ allClients, archivedClients, warningClients, userRole }: ClientsPageTabsProps) {
    const [view, setView] = useState<TabView>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const getTitle = () => {
        switch (view) {
            case 'all': return 'Clientes';
            case 'archived': return 'Clientes Archivados';
            case 'warnings': return 'Clientes con Advertencias';
        }
    };

    const getSubtitle = () => {
        switch (view) {
            case 'all': return 'Gestión y búsqueda de todos los clientes';
            case 'archived': return 'Clientes ocultos que pueden ser restaurados';
            case 'warnings': return 'Gestión de No-Shows y Vetos';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">
                        {getTitle()}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {getSubtitle()}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* New Client Button - only show on active view */}
                    {view !== 'archived' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-lg shadow-gray-200"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">Nuevo Cliente</span>
                        </button>
                    )}

                    {/* Tab Buttons */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setView('all')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${view === 'all'
                                ? 'bg-white shadow-sm text-gray-900'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            <span className="hidden sm:inline">Activos</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${view === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                                }`}>
                                {allClients.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setView('archived')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${view === 'archived'
                                ? 'bg-white shadow-sm text-gray-900'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Archive className="w-4 h-4" />
                            <span className="hidden sm:inline">Archivados</span>
                            {archivedClients.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${view === 'archived' ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-600'
                                    }`}>
                                    {archivedClients.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setView('warnings')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${view === 'warnings'
                                ? 'bg-white shadow-sm text-gray-900'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            <span className="hidden sm:inline">Riesgos</span>
                            {warningClients.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${view === 'warnings' ? 'bg-red-100 text-red-700' : 'bg-red-100 text-red-600'
                                    }`}>
                                    {warningClients.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {view === 'all' && (
                <AllClientsTable clients={allClients} />
            )}
            {view === 'archived' && (
                <AllClientsTable clients={archivedClients} isArchivedView={true} />
            )}
            {view === 'warnings' && (
                <ClientWarningsTable clients={warningClients} userRole={userRole} />
            )}

            {/* Create Client Modal */}
            <CreateClientModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />
        </div>
    );
}
