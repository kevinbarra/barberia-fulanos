'use client';

import { useState, useEffect } from 'react';
import { 
    Pencil, 
    Trash2, 
    ExternalLink, 
    Plus, 
    X, 
    AlertTriangle, 
    Loader2, 
    Search, 
    Calendar, 
    DollarSign, 
    TrendingUp, 
    TrendingDown, 
    Building2, 
    MessageSquare, 
    AlertCircle, 
    Ban, 
    Check,
    Palette,
    Sparkles,
    Clock,
    Globe,
    CreditCard,
    Building
} from 'lucide-react';
import Link from 'next/link';
import { deleteTenant, updateTenantAdmin, toggleTenantStatus } from '@/app/admin/platform/actions';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Tenant = {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    subscription_status: string;
    settings?: any;
    plan?: string;
    trial_ends_at?: string;
    brand_color?: string;
    timezone?: string;
    logo_url?: string | null;
};

interface PlatformTenantListProps {
    tenants: Tenant[];
    stats?: {
        totalTenants: number;
        activeTenants: number;
        suspendedTenants: number;
        monthlyBookings: number;
        monthlyRevenue: number;
        bookingTrend: number;
        revenueTrend: number;
        last7Days: Array<{ day: string; count: number }>;
    };
}

export default function PlatformTenantList({ tenants, stats }: PlatformTenantListProps) {
    const router = useRouter();
    const [editTenant, setEditTenant] = useState<Tenant | null>(null);
    const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
    const [confirmSlug, setConfirmSlug] = useState('');
    
    // Edit form states
    const [editName, setEditName] = useState('');
    const [editSlug, setEditSlug] = useState('');
    const [editWhatsapp, setEditWhatsapp] = useState('');
    const [editPlan, setEditPlan] = useState('');
    const [editBrandColor, setEditBrandColor] = useState('');
    const [editTimezone, setEditTimezone] = useState('');
    const [editTrialEndsAt, setEditTrialEndsAt] = useState('');
    const [editSubscriptionStatus, setEditSubscriptionStatus] = useState('');
    const [editLogoUrl, setEditLogoUrl] = useState('');
    const [editThemePreset, setEditThemePreset] = useState('dark-modern');
    const [isExtractingColor, setIsExtractingColor] = useState(false);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTab, setFilterTab] = useState<'all' | 'active' | 'suspended' | 'pro' | 'trial'>('all');

    // Prevent hydration error for charts
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Local metrics calculations if stats are missing
    const totalTenants = stats?.totalTenants ?? tenants.length;
    const activeTenants = stats?.activeTenants ?? tenants.filter(t => t.subscription_status === 'active').length;
    const suspendedTenants = stats?.suspendedTenants ?? tenants.filter(t => t.subscription_status === 'suspended').length;
    const monthlyBookings = stats?.monthlyBookings ?? 0;
    const monthlyRevenue = stats?.monthlyRevenue ?? 0;
    const bookingTrend = stats?.bookingTrend ?? 0;
    const revenueTrend = stats?.revenueTrend ?? 0;
    const last7Days = stats?.last7Days ?? [];

    const handleEdit = (t: Tenant) => {
        setEditTenant(t);
        setEditName(t.name);
        setEditSlug(t.slug);
        setEditWhatsapp(t.settings?.whatsapp_phone || '');
        setEditPlan(t.plan || 'trial');
        setEditBrandColor(t.brand_color || '#8b5cf6');
        setEditTimezone(t.timezone || 'America/Mexico_City');
        setEditTrialEndsAt(t.trial_ends_at ? new Date(t.trial_ends_at).toISOString().split('T')[0] : '');
        setEditSubscriptionStatus(t.subscription_status || 'active');
        setEditLogoUrl(t.logo_url || '');
        setEditThemePreset(t.settings?.theme_preset || 'dark-modern');
        setMessage(null);
    };

    const extractColorFromLogo = async () => {
        if (!editLogoUrl) {
            setMessage({ text: 'Introduce primero una URL de logo válida.', type: 'error' });
            return;
        }
        setIsExtractingColor(true);
        try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = editLogoUrl;
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        setIsExtractingColor(false);
                        return;
                    }
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    
                    let rSum = 0, gSum = 0, bSum = 0, count = 0;
                    
                    for (let i = 0; i < imageData.length; i += 16) {
                        const r = imageData[i];
                        const g = imageData[i+1];
                        const b = imageData[i+2];
                        const a = imageData[i+3];
                        
                        // Skip fully transparent, pure white, or pure black pixels
                        if (a > 200 && !(r > 240 && g > 240 && b > 240) && !(r < 20 && g < 20 && b < 20)) {
                            rSum += r;
                            gSum += g;
                            bSum += b;
                            count++;
                        }
                    }
                    
                    if (count > 0) {
                        const rAvg = Math.round(rSum / count);
                        const gAvg = Math.round(gSum / count);
                        const bAvg = Math.round(bSum / count);
                        const toHex = (x: number) => {
                            const hex = x.toString(16);
                            return hex.length === 1 ? '0' + hex : hex;
                        };
                        const extractedHex = `#${toHex(rAvg)}${toHex(gAvg)}${toHex(bAvg)}`;
                        setEditBrandColor(extractedHex);
                        setMessage({ text: 'Color de marca sincronizado con el logo.', type: 'success' });
                    } else {
                        setMessage({ text: 'No se pudo identificar un color predominante. Usando color base.', type: 'error' });
                    }
                } catch (e) {
                    console.error(e);
                    setMessage({ text: 'Error al procesar el logo (¿restricciones de CORS?).', type: 'error' });
                } finally {
                    setIsExtractingColor(false);
                }
            };
            img.onerror = () => {
                setMessage({ text: 'No se pudo cargar la imagen del logo. Revisa la URL.', type: 'error' });
                setIsExtractingColor(false);
            };
        } catch (error) {
            console.error(error);
            setIsExtractingColor(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editTenant) return;
        setLoading(true);
        const result = await updateTenantAdmin(editTenant.id, {
            name: editName,
            slug: editSlug,
            whatsapp_phone: editWhatsapp,
            plan: editPlan,
            brand_color: editBrandColor,
            timezone: editTimezone,
            trial_ends_at: editTrialEndsAt ? new Date(editTrialEndsAt).toISOString() : null,
            subscription_status: editSubscriptionStatus as 'active' | 'suspended',
            logo_url: editLogoUrl || null,
            theme_preset: editThemePreset as 'dark-modern' | 'spa-light',
        });
        setLoading(false);
        if (result.error) {
            setMessage({ text: result.error, type: 'error' });
        } else {
            setMessage({ text: result.message || 'Guardado exitosamente.', type: 'success' });
            setTimeout(() => { 
                setEditTenant(null); 
                setMessage(null); 
                router.refresh(); 
            }, 1000);
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
            setMessage({ text: result.message || 'Eliminado permanentemente.', type: 'success' });
            setTimeout(() => { 
                setDeletingTenant(null); 
                setMessage(null); 
                setConfirmSlug(''); 
                router.refresh(); 
            }, 1200);
        }
    };

    const handleToggleStatus = async (t: Tenant) => {
        const newStatus = t.subscription_status === 'active' ? 'suspended' : 'active';
        await toggleTenantStatus(t.id, newStatus as 'active' | 'suspended');
        router.refresh();
    };

    // Filter tenant list
    const filteredTenants = tenants.filter((tenant) => {
        const matchesSearch = 
            tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;
        
        if (filterTab === 'active') return tenant.subscription_status === 'active';
        if (filterTab === 'suspended') return tenant.subscription_status === 'suspended';
        if (filterTab === 'pro') return tenant.plan === 'pro';
        if (filterTab === 'trial') return tenant.plan === 'trial';
        
        return true;
    });

    // Helper functions for graphics & tags
    const getGradientForSlug = (slug: string) => {
        const gradients = [
            'from-pink-500 to-rose-500',
            'from-amber-400 to-orange-500',
            'from-emerald-400 to-teal-500',
            'from-blue-500 to-indigo-600',
            'from-violet-500 to-purple-600',
            'from-cyan-400 to-blue-500'
        ];
        let hash = 0;
        for (let i = 0; i < slug.length; i++) {
            hash = slug.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % gradients.length;
        return gradients[index];
    };

    const getPlanBadge = (plan?: string) => {
        switch (plan) {
            case 'pro':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Plan Pro ✨
                    </span>
                );
            case 'enterprise':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        Enterprise 🏛️
                    </span>
                );
            case 'basic':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                        Básico ⚡
                    </span>
                );
            case 'trial':
            default:
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Prueba ⏳
                    </span>
                );
        }
    };

    const getTrialStatusText = (tenant: Tenant) => {
        if (tenant.plan !== 'trial' && tenant.plan !== undefined) {
            return (
                <p className="text-xs text-zinc-400 mt-1 font-medium">
                    Suscripción activa
                </p>
            );
        }
        if (!tenant.trial_ends_at) return null;
        const end = new Date(tenant.trial_ends_at);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
            return (
                <p className="text-xs text-zinc-400 mt-1 font-medium">
                    Prueba vence en: <span className="text-blue-400 font-bold">{diffDays} días</span>
                </p>
            );
        } else {
            return (
                <p className="text-xs text-red-400 mt-1 font-bold">
                    ⚠️ Prueba vencida
                </p>
            );
        }
    };

    const getWhatsAppUrl = (tenantName: string, phone?: string) => {
        if (!phone) return null;
        const cleanPhone = phone.replace(/\D/g, '');
        const message = `Hola ${tenantName}, te contacto desde el soporte de AgendaBarber. ¿Cómo va tu experiencia en la plataforma?`;
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return 'N/A';
        }
    };

    return (
        <div className="space-y-8">
            {/* OPERATIONAL STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Tenants */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 text-zinc-400 group-hover:scale-110 transition-transform duration-300">
                        <Building2 size={80} />
                    </div>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Barberías Totales</p>
                            <h4 className="text-3xl font-black text-white">
                                {tenants.length} <span className="text-xs text-zinc-500 font-medium">registradas</span>
                            </h4>
                        </div>
                        <div className="p-3 bg-zinc-800 text-zinc-400 rounded-xl border border-zinc-700/30">
                            <Building2 size={20} />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-zinc-500 font-medium">
                        Historial total de tenants creados
                    </div>
                </div>

                {/* Barberías Activas */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform duration-300">
                        <Building2 size={80} />
                    </div>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Activas en Producción</p>
                            <h4 className="text-3xl font-black text-white">
                                {tenants.filter(t => t.subscription_status === 'active').length} <span className="text-xs text-zinc-500 font-medium">activas</span>
                            </h4>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <Building2 size={20} />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Operando actualmente y agendando
                    </div>
                </div>

                {/* Suscripciones Pro */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 text-amber-500 group-hover:scale-110 transition-transform duration-300">
                        <Building2 size={80} />
                    </div>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Clientes Premium (Pro)</p>
                            <h4 className="text-3xl font-black text-white">
                                {tenants.filter(t => t.plan === 'pro' || t.plan === 'enterprise').length} <span className="text-xs text-zinc-500 font-medium">premium</span>
                            </h4>
                        </div>
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                            <Building2 size={20} />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-amber-400 font-bold">
                        ★ Licencias Pro / Enterprise activas
                    </div>
                </div>
            </div>

            {/* BARBER LIST MAIN BLOCK */}
            <div className="space-y-6">
                {/* SEARCH AND FILTERS */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-4 backdrop-blur-sm">
                    {/* Search bar */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-3 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por negocio, slug, subdominio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-900/60 border border-zinc-800 text-sm rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')} 
                                className="absolute right-3 top-2.5 p-0.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Filter tabs and Create button */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs">
                            <button
                                onClick={() => setFilterTab('all')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filterTab === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilterTab('active')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filterTab === 'active' ? 'bg-emerald-500/10 text-emerald-400 shadow-sm border border-emerald-500/20' : 'text-zinc-400 hover:text-white'}`}
                            >
                                Activos
                            </button>
                            <button
                                onClick={() => setFilterTab('suspended')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filterTab === 'suspended' ? 'bg-red-500/10 text-red-400 shadow-sm border border-red-500/20' : 'text-zinc-400 hover:text-white'}`}
                            >
                                Suspendidos
                            </button>
                            <button
                                onClick={() => setFilterTab('pro')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filterTab === 'pro' ? 'bg-amber-500/10 text-amber-400 shadow-sm border border-amber-500/20' : 'text-zinc-400 hover:text-white'}`}
                            >
                                Plan Pro
                            </button>
                            <button
                                onClick={() => setFilterTab('trial')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filterTab === 'trial' ? 'bg-blue-500/10 text-blue-400 shadow-sm border border-blue-500/20' : 'text-zinc-400 hover:text-white'}`}
                            >
                                En Prueba
                            </button>
                        </div>

                        <Link
                            href="/admin/platform/new"
                            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 px-4 py-2 rounded-xl text-xs font-black transition-colors"
                        >
                            <Plus size={14} /> Crear Negocio
                        </Link>
                    </div>
                </div>

                {/* TENANTS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTenants.map((tenant) => {
                        const waUrl = getWhatsAppUrl(tenant.name, tenant.settings?.whatsapp_phone);
                        const initialGradient = getGradientForSlug(tenant.slug);
                        
                        return (
                            <div 
                                key={tenant.id} 
                                className="bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between h-full group transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
                            >
                                <div>
                                    {/* Identity header */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${initialGradient} flex items-center justify-center font-black text-xl text-white uppercase shadow-md`}>
                                            {tenant.name[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                                                {tenant.name}
                                            </h4>
                                            <a 
                                                href={`https://${tenant.slug}.agendabarber.pro`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1 hover:text-zinc-300 transition-colors mt-0.5"
                                            >
                                                {tenant.slug}.agendabarber.pro <ExternalLink size={10} />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Stats, Plan and Status details */}
                                    <div className="space-y-2 border-t border-zinc-800/60 pt-4 mb-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Plan</span>
                                            {getPlanBadge(tenant.plan)}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estado</span>
                                            <button
                                                onClick={() => handleToggleStatus(tenant)}
                                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 ${
                                                    tenant.subscription_status === 'active' 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${tenant.subscription_status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                                {tenant.subscription_status === 'active' ? 'Activo' : 'Suspendido'}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Registro</span>
                                            <span className="text-xs text-zinc-300 font-medium">{formatDate(tenant.created_at)}</span>
                                        </div>
                                        
                                        {/* Days left indicator */}
                                        <div className="bg-zinc-950/40 rounded-xl p-2.5 border border-zinc-800/30 flex items-center justify-between mt-2">
                                            <div>
                                                {getTrialStatusText(tenant)}
                                            </div>
                                            
                                            {waUrl ? (
                                                <a
                                                    href={waUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all uppercase"
                                                    title="Contactar al dueño"
                                                >
                                                    <MessageSquare size={12} /> Contactar
                                                </a>
                                            ) : (
                                                <span className="text-[9px] text-zinc-600 font-bold uppercase">Sin WhatsApp</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions footer panel */}
                                <div className="flex items-center justify-between gap-2 border-t border-zinc-800/60 pt-4 mt-2">
                                    {/* ENTER PANEL */}
                                    <a
                                        href={`https://${tenant.slug}.agendabarber.pro/admin`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all border border-zinc-700/40"
                                        title="Impersonar y entrar al panel administrativo del negocio"
                                    >
                                        <ExternalLink size={12} /> Entrar
                                    </a>

                                    <div className="flex items-center gap-2">
                                        {/* EDIT */}
                                        <button
                                            onClick={() => handleEdit(tenant)}
                                            className="p-2 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                                            title="Editar Nombre o WhatsApp"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        
                                        {/* DELETE */}
                                        <button
                                            onClick={() => { 
                                                setDeletingTenant(tenant); 
                                                setConfirmSlug(''); 
                                                setMessage(null); 
                                            }}
                                            className="p-2 rounded-xl bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-900/20 hover:border-red-900/50 transition-colors"
                                            title="Eliminar permanentemente"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredTenants.length === 0 && (
                        <div className="col-span-full py-16 text-center bg-zinc-900/20 border border-zinc-800/60 rounded-2xl">
                            <AlertCircle className="mx-auto text-zinc-500 mb-3" size={32} />
                            <p className="text-zinc-400 font-bold">No se encontraron negocios con esos filtros.</p>
                            <p className="text-zinc-600 text-xs mt-1">Intenta ajustando el buscador o las pestañas superiores.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* EDIT MODAL */}
            {editTenant && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditTenant(null)}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-2xl p-6 md:p-8 space-y-6 my-8" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                                    <Palette size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-white uppercase tracking-tight">Editar Negocio</h3>
                                    <p className="text-zinc-500 text-xs mt-0.5">Gestión administrativa y de branding global</p>
                                </div>
                            </div>
                            <button onClick={() => setEditTenant(null)} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Two Column Form Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* COL 1: IDENTIDAD & DISEÑO */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800/60 pb-1.5 flex items-center gap-1.5">
                                    <Building size={12} className="text-zinc-500" />
                                    Identidad y Branding
                                </h4>

                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Nombre Comercial</label>
                                    <input 
                                        type="text"
                                        value={editName} 
                                        onChange={e => setEditName(e.target.value)} 
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors" 
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Enlace Slug (URL)</label>
                                    <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-colors">
                                        <span className="px-3 bg-zinc-900 border-r border-zinc-800 text-[10px] font-mono text-zinc-500">.agendabarber.pro</span>
                                        <input 
                                            type="text"
                                            value={editSlug} 
                                            onChange={e => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                                            className="flex-1 bg-transparent border-none px-3 py-2.5 text-sm font-mono text-white focus:outline-none" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">URL del Logo</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={editLogoUrl} 
                                            onChange={e => setEditLogoUrl(e.target.value)} 
                                            placeholder="https://ejemplo.com/logo.png"
                                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-zinc-700" 
                                        />
                                    </div>
                                    {editLogoUrl && (
                                        <div className="mt-2 flex items-center gap-3 bg-zinc-950/60 p-2 border border-zinc-800/40 rounded-xl">
                                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0 flex items-center justify-center">
                                                <img src={editLogoUrl} alt="Preview" className="object-cover w-full h-full" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={extractColorFromLogo}
                                                disabled={isExtractingColor}
                                                className="flex-1 py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                            >
                                                {isExtractingColor ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={10} /> Extrayendo...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles size={10} /> Sincronizar Color
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Tema / Preset Visual</label>
                                    <select
                                        value={editThemePreset}
                                        onChange={e => setEditThemePreset(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors cursor-pointer appearance-none"
                                    >
                                        <option value="dark-modern">Barbería Oscura (Modern Dark)</option>
                                        <option value="spa-light">Spa Luminoso (Spa Light)</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Brand Color Selector */}
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 block mb-1">Color de Marca</label>
                                        <div className="relative flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 pr-3">
                                            <input
                                                type="color"
                                                value={editBrandColor}
                                                onChange={e => setEditBrandColor(e.target.value)}
                                                className="w-10 h-8 border-none bg-transparent cursor-pointer p-0 shrink-0"
                                            />
                                            <span className="text-[10px] text-zinc-300 ml-2 font-mono uppercase truncate font-bold">{editBrandColor}</span>
                                        </div>
                                    </div>

                                    {/* Preview Box */}
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 block mb-1">Previsualización</label>
                                        <div 
                                            className="h-10 rounded-xl border border-zinc-800 flex items-center justify-center text-[10px] font-black uppercase tracking-wider text-white shadow-inner transition-all duration-300"
                                            style={{ backgroundColor: editBrandColor, boxShadow: `inset 0 2px 4px rgba(0,0,0,0.3), 0 0 10px ${editBrandColor}33` }}
                                        >
                                            Botón ⚡
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COL 2: SUSCRIPCIÓN & CONFIG */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800/60 pb-1.5 flex items-center gap-1.5">
                                    <CreditCard size={12} className="text-zinc-500" />
                                    Suscripción y Ajustes
                                </h4>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 block mb-1">Plan</label>
                                        <select
                                            value={editPlan}
                                            onChange={e => setEditPlan(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors cursor-pointer appearance-none"
                                        >
                                            <option value="trial">Prueba (Trial)</option>
                                            <option value="basic">Plan Básico</option>
                                            <option value="pro">Plan Pro</option>
                                            <option value="enterprise">Enterprise</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 block mb-1">Estado de Suscripción</label>
                                        <select
                                            value={editSubscriptionStatus}
                                            onChange={e => setEditSubscriptionStatus(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors cursor-pointer appearance-none"
                                        >
                                            <option value="active">Activo</option>
                                            <option value="suspended">Suspendido</option>
                                        </select>
                                    </div>
                                </div>

                                {editPlan === 'trial' && (
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 block mb-1">Fecha Fin de Prueba (Trial Ends)</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3.5 top-3.5 text-zinc-600" size={14} />
                                            <input 
                                                type="date"
                                                value={editTrialEndsAt} 
                                                onChange={e => setEditTrialEndsAt(e.target.value)} 
                                                className="w-full pl-9 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer" 
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Zona Horaria</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3.5 top-3.5 text-zinc-600" size={14} />
                                        <select
                                            value={editTimezone}
                                            onChange={e => setEditTimezone(e.target.value)}
                                            className="w-full pl-9 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition-colors cursor-pointer appearance-none"
                                        >
                                            <option value="America/Mexico_City">🇲🇽 Ciudad de México</option>
                                            <option value="America/Tijuana">🇲🇽 Tijuana</option>
                                            <option value="America/Monterrey">🇲🇽 Monterrey</option>
                                            <option value="America/Hermosillo">🇲🇽 Hermosillo</option>
                                            <option value="America/Cancun">🇲🇽 Cancún</option>
                                            <option value="America/Santo_Domingo">🇩🇴 Rep. Dominicana</option>
                                            <option value="America/Bogota">🇨🇴 Colombia / Perú</option>
                                            <option value="America/Santiago">🇨🇱 Chile</option>
                                            <option value="America/Argentina/Buenos_Aires">🇦🇷 Argentina</option>
                                            <option value="Europe/Madrid">🇪🇸 España (Madrid)</option>
                                            <option value="America/New_York">🇺🇸 USA Este (NY/Miami)</option>
                                            <option value="America/Chicago">🇺🇸 USA Centro (Texas)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Teléfono WhatsApp</label>
                                    <div className="relative">
                                        <MessageSquare className="absolute left-3.5 top-3.5 text-zinc-600" size={14} />
                                        <input 
                                            type="text"
                                            value={editWhatsapp} 
                                            onChange={e => setEditWhatsapp(e.target.value)} 
                                            placeholder="ej. 522294593949" 
                                            className="w-full pl-9 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-zinc-700 font-mono" 
                                        />
                                    </div>
                                    <p className="text-[9px] text-zinc-500 mt-1">Incluye el código de país sin el signo + (ej. 52 para México).</p>
                                </div>
                            </div>
                        </div>

                        {/* Message Banner */}
                        {message && (
                            <div className={`text-xs font-bold p-3 rounded-xl border ${
                                message.type === 'error' 
                                    ? 'bg-red-500/5 text-red-400 border-red-500/10' 
                                    : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10'
                            }`}>
                                {message.text}
                            </div>
                        )}
                        
                        {/* Actions buttons */}
                        <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/60">
                            <button 
                                onClick={() => setEditTenant(null)} 
                                className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.99] border border-zinc-700/30"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveEdit} 
                                disabled={loading} 
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 py-3.5 rounded-xl font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-lg shadow-amber-500/5 hover:shadow-amber-500/15"
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deletingTenant && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeletingTenant(null)}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                            <div className="p-3 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-lg text-white">Eliminación Permanente</h3>
                                <p className="text-xs text-zinc-400 font-medium">Esta acción eliminará permanentemente todos los datos.</p>
                            </div>
                        </div>
                        <div className="bg-red-950/20 rounded-xl p-4 border border-red-900/30">
                            <p className="text-sm text-red-300 font-medium leading-relaxed">
                                Se eliminarán de forma en cascada <span className="font-black">todas las citas, servicios, horarios, fotos, configuraciones y usuarios vinculados</span> al negocio <span className="font-black text-white">&ldquo;{deletingTenant.name}&rdquo;</span>.
                            </p>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">
                                Escribe <span className="text-red-400 font-bold">&ldquo;{deletingTenant.slug}&rdquo;</span> para confirmar la destrucción:
                            </label>
                            <input
                                value={confirmSlug}
                                onChange={e => setConfirmSlug(e.target.value)}
                                placeholder={deletingTenant.slug}
                                className="w-full bg-zinc-950 border border-red-900/40 focus:border-red-500 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
                                autoFocus
                            />
                        </div>

                        {message && (
                            <p className={`text-xs font-bold ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{message.text}</p>
                        )}
                        
                        <div className="flex items-center gap-3 pt-2">
                            <button 
                                onClick={() => setDeletingTenant(null)} 
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading || confirmSlug.trim().toLowerCase() !== deletingTenant.slug}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:hover:bg-red-600 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Destruir Negocio 💥'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
