'use client';

import { useState } from 'react';
import { Pencil, Trash2, ExternalLink, Plus, X, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { deleteTenant, updateTenantAdmin, toggleTenantStatus } from '@/app/admin/platform/actions';
import { useRouter } from 'next/navigation';

type Tenant = {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    subscription_status: string;
    settings?: any;
};

export default function PlatformTenantList({ tenants }: { tenants: Tenant[] }) {
    const router = useRouter();
    const [editTenant, setEditTenant] = useState<Tenant | null>(null);
    const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
    const [confirmSlug, setConfirmSlug] = useState('');
    const [editName, setEditName] = useState('');
    const [editWhatsapp, setEditWhatsapp] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleEdit = (t: Tenant) => {
        setEditTenant(t);
        setEditName(t.name);
        setEditWhatsapp(t.settings?.whatsapp_phone || '');
        setMessage(null);
    };

    const handleSaveEdit = async () => {
        if (!editTenant) return;
        setLoading(true);
        const result = await updateTenantAdmin(editTenant.id, {
            name: editName,
            whatsapp_phone: editWhatsapp,
        });
        setLoading(false);
        if (result.error) {
            setMessage({ text: result.error, type: 'error' });
        } else {
            setMessage({ text: result.message || 'Guardado.', type: 'success' });
            setTimeout(() => { setEditTenant(null); setMessage(null); router.refresh(); }, 1000);
        }
    };

    const handleDelete = async () => {
        if (!deletingTenant) return;
        setLoading(true);
        const result = await deleteTenant(deletingTenant.id, confirmSlug);
        setLoading(false);
        if (result.error) {
            setMessage({ text: result.error, type: 'error' });
        } else {
            setMessage({ text: result.message || 'Eliminado.', type: 'success' });
            setTimeout(() => { setDeletingTenant(null); setMessage(null); setConfirmSlug(''); router.refresh(); }, 1200);
        }
    };

    const handleToggleStatus = async (t: Tenant) => {
        const newStatus = t.subscription_status === 'active' ? 'suspended' : 'active';
        await toggleTenantStatus(t.id, newStatus as 'active' | 'suspended');
        router.refresh();
    };

    return (
        <>
            {/* HEADER WITH CREATE BUTTON */}
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Negocios</h3>
                <Link
                    href="/admin/platform/new"
                    className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
                >
                    <Plus size={14} /> Nueva Barbería
                </Link>
            </div>

            {/* TENANT LIST */}
            <div className="divide-y divide-gray-50">
                {tenants.map((tenant) => (
                    <div key={tenant.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-400 uppercase shrink-0">
                                {tenant.name[0]}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate">{tenant.name}</p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">{tenant.slug}.agendabarber.pro</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => handleToggleStatus(tenant)}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase cursor-pointer hover:opacity-80 transition-opacity ${
                                    tenant.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                }`}
                            >
                                {tenant.subscription_status}
                            </button>
                            {/* IMPERSONATION LINK */}
                            <a
                                href={`https://${tenant.slug}.agendabarber.pro/admin`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                                title="Entrar al Panel"
                            >
                                <ExternalLink size={14} />
                            </a>
                            {/* EDIT */}
                            <button
                                onClick={() => handleEdit(tenant)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                                title="Editar"
                            >
                                <Pencil size={14} />
                            </button>
                            {/* DELETE */}
                            <button
                                onClick={() => { setDeletingTenant(tenant); setConfirmSlug(''); setMessage(null); }}
                                className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
                {tenants.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-sm">No hay negocios registrados.</div>
                )}
            </div>

            {/* EDIT MODAL */}
            {editTenant && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditTenant(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-lg text-gray-900">Editar Negocio</h3>
                            <button onClick={() => setEditTenant(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nombre</label>
                            <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand focus:border-transparent outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">WhatsApp</label>
                            <input value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} placeholder="522294593949" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand focus:border-transparent outline-none" />
                        </div>
                        {message && (
                            <p className={`text-xs font-bold ${message.type === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>{message.text}</p>
                        )}
                        <button onClick={handleSaveEdit} disabled={loading} className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deletingTenant && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeletingTenant(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertTriangle size={24} className="text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg text-gray-900">Eliminación Permanente</h3>
                                <p className="text-xs text-gray-500">Esta acción no se puede deshacer.</p>
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                            <p className="text-sm text-red-700 font-medium">
                                Se eliminarán <span className="font-black">todas</span> las citas, servicios, horarios y datos del negocio <span className="font-black">&ldquo;{deletingTenant.name}&rdquo;</span>.
                            </p>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                Escribe &ldquo;{deletingTenant.slug}&rdquo; para confirmar
                            </label>
                            <input
                                value={confirmSlug}
                                onChange={e => setConfirmSlug(e.target.value)}
                                placeholder={deletingTenant.slug}
                                className="w-full border border-red-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none"
                                autoFocus
                            />
                        </div>
                        {message && (
                            <p className={`text-xs font-bold ${message.type === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>{message.text}</p>
                        )}
                        <button
                            onClick={handleDelete}
                            disabled={loading || confirmSlug.trim().toLowerCase() !== deletingTenant.slug}
                            className="w-full bg-red-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-30 flex items-center justify-center gap-2 hover:bg-red-700 transition-colors"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Eliminar Permanentemente'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
