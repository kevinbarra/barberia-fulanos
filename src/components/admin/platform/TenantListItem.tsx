'use client';

import { useState } from 'react';
import { toggleTenantStatus } from '@/app/admin/platform/actions';
import { toast } from 'sonner';
import { MoreVertical, Pause, Play, ExternalLink, Loader2, Users, Calendar } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    created_at: string;
}

export default function TenantListItem({ tenant }: { tenant: Tenant }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(tenant.subscription_status);

    const isActive = currentStatus === 'active';

    const handleToggleStatus = async () => {
        setIsLoading(true);
        setShowMenu(false);
        const newStatus = isActive ? 'suspended' : 'active';

        const result = await toggleTenantStatus(tenant.id, newStatus);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(result.message);
            setCurrentStatus(newStatus); // Optimistic update
        }
        setIsLoading(false);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const daysSinceCreation = Math.floor((Date.now() - new Date(tenant.created_at).getTime()) / (1000 * 60 * 60 * 24));

    return (
        <div className={`p-4 hover:bg-gray-50 transition-all ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black uppercase flex-shrink-0 ${isActive
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                    }`}>
                    {tenant.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">{tenant.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive
                            ? 'text-green-700 bg-green-100'
                            : 'text-red-700 bg-red-100'
                            }`}>
                            {isActive ? 'Activo' : 'Suspendido'}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{tenant.slug}</span>
                        <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {daysSinceCreation === 0 ? 'Hoy' : `${daysSinceCreation}d`}
                        </span>
                    </div>
                </div>

                {/* Quick Action Button */}
                <button
                    onClick={() => isActive ? setShowConfirmModal(true) : handleToggleStatus()}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-all ${isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                >
                    {isLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : isActive ? (
                        <Pause size={16} />
                    ) : (
                        <Play size={16} />
                    )}
                    <span className="hidden sm:inline">{isActive ? 'Suspender' : 'Activar'}</span>
                </button>

                {/* More Actions */}
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <MoreVertical size={18} className="text-gray-400" />
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 bottom-full mb-1 bg-white rounded-xl shadow-xl border border-gray-200 py-2 w-48 z-20">
                                <a
                                    href={`https://${tenant.slug}.agendabarber.pro`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700"
                                >
                                    <ExternalLink size={16} />
                                    Abrir Sitio
                                </a>
                                <a
                                    href={`https://${tenant.slug}.agendabarber.pro/admin`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700"
                                >
                                    <Users size={16} />
                                    Ver Admin Panel
                                </a>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={() => {
                    setShowConfirmModal(false);
                    handleToggleStatus();
                }}
                title="¿Suspender barbería?"
                message={`Estás a punto de suspender "${tenant.name}". Los usuarios de esta barbería no podrán acceder hasta que la reactives.`}
                confirmText="Suspender"
                confirmVariant="danger"
                isLoading={isLoading}
            />
        </div>
    );
}
