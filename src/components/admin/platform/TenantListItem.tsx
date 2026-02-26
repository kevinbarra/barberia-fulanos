'use client';

import { useState } from 'react';
import { toggleTenantStatus, updateTenantAdmin } from '@/app/admin/platform/actions';
import { toast } from 'sonner';
import { MoreVertical, Pause, Play, ExternalLink, Loader2, Users, Calendar, Pencil, X, Save, Phone, Building, Globe, MapPin } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    created_at: string;
    settings?: { whatsapp_phone?: string } | null;
}

export default function TenantListItem({ tenant }: { tenant: Tenant }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(tenant.subscription_status);

    // Inline edit state
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editName, setEditName] = useState(tenant.name);
    const [editSlug, setEditSlug] = useState(tenant.slug);
    const [editWhatsApp, setEditWhatsApp] = useState(
        (tenant.settings as any)?.whatsapp_phone || ''
    );
    const [editAddress, setEditAddress] = useState(
        (tenant.settings as any)?.address || ''
    );

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
            setCurrentStatus(newStatus);
        }
        setIsLoading(false);
    };

    const handleSaveEdit = async () => {
        setIsSaving(true);
        const result = await updateTenantAdmin(tenant.id, {
            name: editName !== tenant.name ? editName : undefined,
            slug: editSlug !== tenant.slug ? editSlug : undefined,
            whatsapp_phone: editWhatsApp,
            address: editAddress,
        });

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(result.message || 'Guardado');
            setIsEditing(false);
        }
        setIsSaving(false);
    };

    const handleCancelEdit = () => {
        setEditName(tenant.name);
        setEditSlug(tenant.slug);
        setEditWhatsApp((tenant.settings as any)?.whatsapp_phone || '');
        setEditAddress((tenant.settings as any)?.address || '');
        setIsEditing(false);
    };

    const daysSinceCreation = Math.floor((Date.now() - new Date(tenant.created_at).getTime()) / (1000 * 60 * 60 * 24));

    return (
        <div className={`transition-all ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Main Row */}
            <div className="p-4 hover:bg-gray-50 transition-all">
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
                            {(tenant.settings as any)?.whatsapp_phone && (
                                <span className="flex items-center gap-1 text-green-600">
                                    <Phone size={12} />
                                    WA
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Edit Button */}
                    <button
                        onClick={() => isEditing ? handleCancelEdit() : setIsEditing(true)}
                        className={`p-2 rounded-lg transition-colors ${isEditing
                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        {isEditing ? <X size={16} /> : <Pencil size={16} />}
                    </button>

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
                                    <a
                                        href={`https://${tenant.slug}.agendabarber.pro/book/${tenant.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700"
                                    >
                                        <Calendar size={16} />
                                        Ver Booking Page
                                    </a>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Inline Edit Panel — Slides down */}
            {isEditing && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 mt-3 space-y-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Editar Datos</p>

                        {/* Name */}
                        <div className="relative">
                            <Building size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Nombre Comercial"
                                className="w-full pl-10 p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium"
                            />
                        </div>

                        {/* Slug */}
                        <div className="relative">
                            <Globe size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                value={editSlug}
                                onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                placeholder="slug-url"
                                className="w-full pl-10 p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-mono"
                            />
                        </div>

                        {/* WhatsApp */}
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="tel"
                                value={editWhatsApp}
                                onChange={(e) => setEditWhatsApp(e.target.value)}
                                placeholder="WhatsApp (ej. 522291589149)"
                                className="w-full pl-10 p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                            />
                            <span className="absolute right-3 top-2.5 text-[10px] text-gray-400 font-medium">
                                Código País + Número
                            </span>
                        </div>

                        {/* Address */}
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                placeholder="Dirección (ej. Av. Reforma 123, Col. Centro)"
                                className="w-full pl-10 p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                            />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={handleSaveEdit}
                                disabled={isSaving}
                                className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Guardar
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
