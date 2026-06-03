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
    Check 
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
    const [editName, setEditName] = useState('');
    const [editWhatsapp, setEditWhatsapp] = useState('');
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
            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Ingresos Card */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 text-amber-500 group-hover:scale-110 transition-transform duration-300">
                        <DollarSign size={80} />
                    </div>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Ingresos del Mes</p>
                            <h4 className="text-3xl font-black text-white">
                                ${monthlyRevenue.toLocaleString('es-MX')} <span className="text-xs text-zinc-500 font-medium">MXN</span>
                            </h4>
                        </div>
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        {revenueTrend >= 0 ? (
                            <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <TrendingUp size={12} /> +{revenueTrend}%
                            </span>
                        ) : (
                            <span className="flex items-center gap-0.5 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                <TrendingDown size={12} /> {revenueTrend}%
                            </span>
                        )}
                        <span className="text-xs text-zinc-500 font-medium">vs mes anterior</span>
                    </div>
                </div>

                {/* Citas Card */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 text-blue-500 group-hover:scale-110 transition-transform duration-300">
                        <Calendar size={80} />
                    </div>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Citas Totales (Mes)</p>
                            <h4 className="text-3xl font-black text-white">
                                {monthlyBookings.toLocaleString()} <span className="text-xs text-zinc-500 font-medium">citas</span>
                            </h4>
                        </div>
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <Calendar size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        {bookingTrend >= 0 ? (
                            <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <TrendingUp size={12} /> +{bookingTrend}%
                            </span>
                        ) : (
                            <span className="flex items-center gap-0.5 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                <TrendingDown size={12} /> {bookingTrend}%
                            </span>
                        )}
                        <span className="text-xs text-zinc-500 font-medium">vs mes anterior</span>
                    </div>
                </div>

                {/* Barberias Card */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 text-violet-500 group-hover:scale-110 transition-transform duration-300">
                        <Building2 size={80} />
                    </div>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Barberías en Plataforma</p>
                            <h4 className="text-3xl font-black text-white">
                                {totalTenants} <span className="text-xs text-zinc-500 font-medium">totales</span>
                            </h4>
                        </div>
                        <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20">
                            <Building2 size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs text-zinc-300 font-bold bg-zinc-800/60 border border-zinc-700/60 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {activeTenants} Activas
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-zinc-300 font-bold bg-zinc-800/60 border border-zinc-700/60 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> {suspendedTenants} Suspendidos
                        </span>
                    </div>
                </div>
            </div>

            {/* CHART */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white">Actividad de Citas</h3>
                        <p className="text-xs text-zinc-400">Total de reservas realizadas por día en la plataforma (Últimos 7 días)</p>
                    </div>
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1.5">
                        <TrendingUp size={14} /> Tiempo Real
                    </span>
                </div>

                <div className="h-[260px] w-full">
                    {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={last7Days}>
                                <defs>
                                    <linearGradient id="bookingTrendGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis 
                                    dataKey="day" 
                                    stroke="#71717a" 
                                    axisLine={false} 
                                    tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 500 }}
                                />
                                <YAxis 
                                    stroke="#71717a" 
                                    axisLine={false} 
                                    tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 500 }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    formatter={(value: number) => [`${value} citas`, 'Reservas']}
                                    contentStyle={{ 
                                        backgroundColor: '#18181b', 
                                        borderColor: '#27272a', 
                                        borderRadius: '12px', 
                                        color: '#f4f4f5',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                                    }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#f59e0b" 
                                    strokeWidth={2.5} 
                                    fillOpacity={1} 
                                    fill="url(#bookingTrendGrad)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full bg-zinc-900/20 rounded-xl animate-pulse flex items-center justify-center border border-zinc-800/40">
                            <Loader2 className="animate-spin text-zinc-600" size={24} />
                        </div>
                    )}
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditTenant(null)}>
                    <div className="bg-zinc-900 border border-zinc-850 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <h3 className="font-black text-lg text-white">Editar Negocio</h3>
                            <button onClick={() => setEditTenant(null)} className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">Nombre Comercial</label>
                                <input 
                                    value={editName} 
                                    onChange={e => setEditName(e.target.value)} 
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-amber-500 transition-colors" 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">Teléfono WhatsApp</label>
                                <input 
                                    value={editWhatsapp} 
                                    onChange={e => setEditWhatsapp(e.target.value)} 
                                    placeholder="ej. 522294593949" 
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-amber-500 transition-colors" 
                                />
                                <p className="text-[10px] text-zinc-500 mt-1 font-medium">Incluye código de país sin el signo + (ej. 52 para México).</p>
                            </div>
                        </div>

                        {message && (
                            <p className={`text-xs font-bold ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{message.text}</p>
                        )}
                        
                        <div className="flex items-center gap-3 pt-2">
                            <button 
                                onClick={() => setEditTenant(null)} 
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveEdit} 
                                disabled={loading} 
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 py-3 rounded-xl font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
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
