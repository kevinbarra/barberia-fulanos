'use client';

import { useState } from 'react';
import { toggleTenantStatus } from '@/app/admin/platform/actions';
import { toast } from 'sonner';
import { MoreVertical, Pause, Play, ExternalLink } from 'lucide-react';

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

    const isActive = tenant.subscription_status === 'active';

    const handleToggleStatus = async () => {
        setIsLoading(true);
        setShowMenu(false);
        const newStatus = isActive ? 'suspended' : 'active';

        const result = await toggleTenantStatus(tenant.id, newStatus);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(result.message);
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

    return (
        <div className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${isLoading ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold uppercase flex-shrink-0 ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                    {tenant.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 truncate">{tenant.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${isActive
                                ? 'text-green-600 bg-green-100'
                                : 'text-red-600 bg-red-100'
                            }`}>
                            {isActive ? 'Activo' : 'Suspendido'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-mono">/{tenant.slug}</span>
                        <span className="text-gray-300">•</span>
                        <span>{formatDate(tenant.created_at)}</span>
                    </div>
                </div>
            </div>

            {/* Actions Menu */}
            <div className="relative flex-shrink-0 ml-2">
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={isLoading}
                >
                    <MoreVertical size={18} className="text-gray-400" />
                </button>

                {showMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-2 w-48 z-20">
                            <a
                                href={`https://${tenant.slug}.agendabarber.pro/admin`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                            >
                                <ExternalLink size={16} />
                                Ver Panel
                            </a>
                            <button
                                onClick={handleToggleStatus}
                                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-sm ${isActive ? 'text-red-600' : 'text-green-600'
                                    }`}
                            >
                                {isActive ? <Pause size={16} /> : <Play size={16} />}
                                {isActive ? 'Suspender' : 'Activar'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
