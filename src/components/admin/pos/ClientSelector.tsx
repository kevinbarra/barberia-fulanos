'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, X, Check, User, Phone, Loader2, Pencil } from 'lucide-react';
import { createManagedClient, searchClients } from '@/app/admin/clients/actions';
import EditClientModal from '@/components/admin/clients/EditClientModal';

// ==================== TYPES ====================

interface SelectedClient {
    id?: string;
    name: string;
    phone?: string;
    isGuest: boolean;
}

interface ClientSelectorProps {
    onSelect: (client: SelectedClient | null) => void;
    initialClientName?: string;
}

interface SearchResult {
    id: string;
    full_name: string;
    phone: string | null;
}

// ==================== COMPONENT ====================

export default function ClientSelector({ onSelect, initialClientName = '' }: ClientSelectorProps) {
    // State
    const [query, setQuery] = useState(initialClientName);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);

    // Registration flow
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [registerName, setRegisterName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [credentialsScript, setCredentialsScript] = useState<string | null>(null);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // ==================== HELPERS ====================

    const sanitizePhone = (input: string) => input.replace(/\D/g, '');
    const isValidPhone = (input: string) => sanitizePhone(input).length === 10;
    const looksLikePhone = (input: string) => /^\d+$/.test(input.trim());

    // ==================== SEARCH EFFECT ====================

    useEffect(() => {
        // Clear previous timeout
        if (debounceRef.current) clearTimeout(debounceRef.current);

        // Don't search if selected or empty
        if (selectedClient || query.length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        // Debounce search
        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const data = await searchClients(query);
                setResults(data);
                setShowDropdown(true);
            } catch {
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, selectedClient]);

    // ==================== HANDLERS ====================

    const handleSelectClient = (client: SearchResult) => {
        const selected: SelectedClient = {
            id: client.id,
            name: client.full_name,
            phone: client.phone || undefined,
            isGuest: false
        };
        setSelectedClient(selected);
        setShowDropdown(false);
        setQuery('');
        onSelect(selected);
    };

    const handleUseAsGuest = () => {
        if (!query.trim()) return;
        const guest: SelectedClient = {
            name: query.trim(),
            isGuest: true
        };
        setSelectedClient(guest);
        setShowDropdown(false);
        onSelect(guest);
    };

    const handleDeselect = () => {
        setSelectedClient(null);
        setQuery('');
        setCredentialsScript(null);
        onSelect(null);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleStartRegister = () => {
        setShowRegisterForm(true);
        setRegisterName('');
    };

    const handleCancelRegister = () => {
        setShowRegisterForm(false);
        setRegisterName('');
    };

    const handleRegister = async () => {
        const phone = sanitizePhone(query);
        if (!isValidPhone(phone)) return;

        setIsRegistering(true);
        try {
            const res = await createManagedClient(registerName || 'Cliente', phone);

            if (res.success && res.data) {
                // Show credentials script
                setCredentialsScript(res.data.script);

                // Auto-select the new client
                const newClient: SelectedClient = {
                    id: res.data.userId,
                    name: registerName || 'Cliente',
                    phone: phone,
                    isGuest: false
                };
                setSelectedClient(newClient);
                setShowRegisterForm(false);
                setShowDropdown(false);
                setQuery('');
                onSelect(newClient);
            } else {
                // Error - show in UI
                alert(res.message || 'Error al registrar cliente');
            }
        } catch {
            alert('Error de conexión');
        } finally {
            setIsRegistering(false);
        }
    };

    const handleDismissCredentials = () => {
        setCredentialsScript(null);
    };

    const handleEditSuccess = (updatedClient: { id: string; name: string; phone: string }) => {
        // Update selected client with new data
        const updated: SelectedClient = {
            id: updatedClient.id,
            name: updatedClient.name,
            phone: updatedClient.phone,
            isGuest: false
        };
        setSelectedClient(updated);
        onSelect(updated);
    };

    // ==================== RENDER ====================

    // Credentials Alert (Persistent - shows after registration)
    if (credentialsScript) {
        return (
            <div className="space-y-3">
                {/* Selected client card */}
                <div className="flex items-center gap-3 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-green-800">{selectedClient?.name}</p>
                        <p className="text-xs text-green-600">{selectedClient?.phone}</p>
                    </div>
                    <button
                        onClick={handleDeselect}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Credentials Script - PERSISTENT ALERT */}
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <Phone className="w-4 h-4 text-amber-700" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-amber-800 mb-1">📢 Léale esto al cliente:</p>
                            <p className="text-amber-900 text-sm leading-relaxed">{credentialsScript}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismissCredentials}
                        className="mt-3 w-full py-2 bg-amber-200 text-amber-800 rounded-lg font-bold text-sm hover:bg-amber-300 transition-colors"
                    >
                        ✓ Listo, ya le dije
                    </button>
                </div>
            </div>
        );
    }

    // Selected Client Card
    if (selectedClient) {
        return (
            <>
                <div className="flex items-center gap-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        {selectedClient.isGuest ? (
                            <User className="w-5 h-5 text-blue-600" />
                        ) : (
                            <Check className="w-5 h-5 text-blue-600" />
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-blue-800">{selectedClient.name}</p>
                        <p className="text-xs text-blue-600">
                            {selectedClient.isGuest ? 'Invitado (sin cuenta)' : selectedClient.phone || 'Cliente registrado'}
                        </p>
                    </div>
                    {/* Edit button - only for registered clients */}
                    {!selectedClient.isGuest && selectedClient.id && (
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                            title="Editar cliente"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={handleDeselect}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                        title="Quitar cliente"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Edit Modal */}
                {selectedClient.id && (
                    <EditClientModal
                        isOpen={showEditModal}
                        onClose={() => setShowEditModal(false)}
                        client={{
                            id: selectedClient.id,
                            name: selectedClient.name,
                            phone: selectedClient.phone
                        }}
                        onSuccess={handleEditSuccess}
                    />
                )}
            </>
        );
    }

    // Search Input + Dropdown
    return (
        <div className="relative">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setShowDropdown(true)}
                    placeholder="Buscar cliente (nombre o teléfono)..."
                    className="w-full pl-10 pr-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                />
                {isSearching && (
                    <Loader2 className="absolute right-3 top-3 w-5 h-5 text-gray-400 animate-spin" />
                )}
            </div>

            {/* Dropdown */}
            {showDropdown && !showRegisterForm && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                    {/* Results */}
                    {results.length > 0 && (
                        <div className="p-2">
                            {results.map((client) => (
                                <button
                                    key={client.id}
                                    onClick={() => handleSelectClient(client)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                                >
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{client.full_name}</p>
                                        {client.phone && (
                                            <p className="text-xs text-gray-500">
                                                ...{client.phone.slice(-4)}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* No results + register option */}
                    {results.length === 0 && query.length >= 2 && (
                        <div className="p-3">
                            <p className="text-sm text-gray-500 mb-3 text-center">
                                No se encontraron clientes
                            </p>

                            {/* Show register if looks like valid phone */}
                            {looksLikePhone(query) && isValidPhone(query) && (
                                <button
                                    onClick={handleStartRegister}
                                    className="w-full flex items-center justify-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl font-bold hover:bg-green-100 transition-colors"
                                >
                                    <UserPlus className="w-5 h-5" />
                                    Registrar Nuevo Cliente
                                </button>
                            )}

                            {/* Always show guest option */}
                            <button
                                onClick={handleUseAsGuest}
                                className="w-full flex items-center justify-center gap-2 p-3 mt-2 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm"
                            >
                                Usar "{query}" como invitado
                            </button>
                        </div>
                    )}

                    {/* Close dropdown */}
                    <button
                        onClick={() => setShowDropdown(false)}
                        className="w-full p-2 text-xs text-gray-400 hover:bg-gray-50 border-t border-gray-100"
                    >
                        Cerrar
                    </button>
                </div>
            )}

            {/* Register Form (Inline) */}
            {showRegisterForm && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-green-300 rounded-xl shadow-xl p-4">
                    <p className="text-sm font-bold text-gray-700 mb-3">
                        📱 Teléfono: {sanitizePhone(query)}
                    </p>

                    <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Nombre del cliente"
                        autoFocus
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm mb-3"
                    />

                    <div className="flex gap-2">
                        <button
                            onClick={handleCancelRegister}
                            disabled={isRegistering}
                            className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleRegister}
                            disabled={isRegistering || !registerName.trim()}
                            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isRegistering ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Crear
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
