'use client';

import { useState, useEffect } from 'react';
import { 
    Calendar, 
    DollarSign, 
    TrendingUp, 
    Building2, 
    Percent, 
    Award, 
    Clock, 
    ShieldCheck,
    Loader2,
    TrendingDown,
    Activity
} from 'lucide-react';
import { 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts';

interface PlatformReportsClientProps {
    stats: {
        totalTenants: number;
        activeTenants: number;
        suspendedTenants: number;
        monthlyBookings: number;
        monthlyRevenue: number;
        bookingTrend: number;
        revenueTrend: number;
        last7Days: Array<{ day: string; count: number }>;
        avgTicket: number;
        rankings: Array<{
            id: string;
            name: string;
            slug: string;
            plan: string;
            subscription_status: string;
            bookingsCount: number;
        }>;
    };
    tenants: Array<{
        id: string;
        name: string;
        slug: string;
        created_at: string;
        subscription_status: string;
        plan?: string;
    }>;
}

export default function PlatformReportsClient({ stats, tenants }: PlatformReportsClientProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Calculate metrics
    const planCounts = tenants.reduce((acc, t) => {
        const p = t.plan || 'trial';
        acc[p] = (acc[p] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const pieData = [
        { name: 'Plan Pro', value: planCounts.pro || 0, color: '#f59e0b' },
        { name: 'En Prueba', value: planCounts.trial || 0, color: '#3b82f6' },
        { name: 'Enterprise', value: planCounts.enterprise || 0, color: '#8b5cf6' },
        { name: 'Básico', value: planCounts.basic || 0, color: '#71717a' },
    ].filter(item => item.value > 0);

    const leaderTenant = stats.rankings && stats.rankings.length > 0 ? stats.rankings[0] : null;

    const getPlanBadge = (plan?: string) => {
        switch (plan) {
            case 'pro':
                return (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Pro ✨
                    </span>
                );
            case 'enterprise':
                return (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        Enterprise 🏛️
                    </span>
                );
            case 'basic':
                return (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                        Básico ⚡
                    </span>
                );
            case 'trial':
            default:
                return (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Prueba ⏳
                    </span>
                );
        }
    };

    return (
        <div className="space-y-8">
            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Ingresos SaaS */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Ingresos del Mes</p>
                            <h4 className="text-2xl font-black text-white">${stats.monthlyRevenue.toLocaleString('es-MX')} MXN</h4>
                        </div>
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                            <DollarSign size={18} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs">
                        {stats.revenueTrend >= 0 ? (
                            <span className="flex items-center gap-0.5 font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <TrendingUp size={12} /> +{stats.revenueTrend}%
                            </span>
                        ) : (
                            <span className="flex items-center gap-0.5 font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                <TrendingDown size={12} /> {stats.revenueTrend}%
                            </span>
                        )}
                        <span className="text-zinc-500 font-medium">vs mes ant.</span>
                    </div>
                </div>

                {/* Reservas Globales */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Reservas del Mes</p>
                            <h4 className="text-2xl font-black text-white">{stats.monthlyBookings.toLocaleString()}</h4>
                        </div>
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <Calendar size={18} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs">
                        {stats.bookingTrend >= 0 ? (
                            <span className="flex items-center gap-0.5 font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <TrendingUp size={12} /> +{stats.bookingTrend}%
                            </span>
                        ) : (
                            <span className="flex items-center gap-0.5 font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                <TrendingDown size={12} /> {stats.bookingTrend}%
                            </span>
                        )}
                        <span className="text-zinc-500 font-medium">vs mes ant.</span>
                    </div>
                </div>

                {/* Ticket Promedio */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Ticket Promedio</p>
                            <h4 className="text-2xl font-black text-white">${stats.avgTicket.toLocaleString('es-MX')} MXN</h4>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <Percent size={18} />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-zinc-400 font-semibold">
                        Valor medio por cita este mes
                    </div>
                </div>

                {/* Barbería Líder */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Barbería Líder</p>
                            <h4 className="text-xl font-bold text-white truncate max-w-[160px]">
                                {leaderTenant ? leaderTenant.name : 'Ninguna'}
                            </h4>
                        </div>
                        <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20">
                            <Award size={18} />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-zinc-400 font-semibold truncate">
                        {leaderTenant ? `${leaderTenant.bookingsCount.toLocaleString()} citas en total` : 'Sin registros'}
                    </div>
                </div>
            </div>

            {/* CHARTS CONTAINER */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 7 Day activity chart */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 lg:col-span-2 backdrop-blur-md">
                    <h3 className="text-base font-bold text-white mb-1">Actividad Diaria de Reservas</h3>
                    <p className="text-xs text-zinc-400 mb-6">Volumen de reservas registradas en los últimos 7 días en todo el SaaS.</p>
                    
                    <div className="h-[280px] w-full">
                        {isMounted ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.last7Days}>
                                    <defs>
                                        <linearGradient id="reportsTrendGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis dataKey="day" stroke="#71717a" axisLine={false} tickLine={false} />
                                    <YAxis stroke="#71717a" axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip
                                        formatter={(value: number) => [`${value} citas`, 'Reservas']}
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#f4f4f5' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#reportsTrendGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full bg-zinc-900/20 rounded-xl animate-pulse flex items-center justify-center">
                                <Loader2 className="animate-spin text-zinc-600" size={24} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Plan Distribution */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-bold text-white mb-1">Distribución de Planes</h3>
                        <p className="text-xs text-zinc-400 mb-4">Proporción de barberías registradas por tipo de suscripción.</p>
                    </div>

                    <div className="h-[180px] w-full flex items-center justify-center">
                        {isMounted && pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [`${value} negocios`, 'Distribución']} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-xs text-zinc-500 italic">Cargando gráfico...</p>
                        )}
                    </div>

                    <div className="space-y-2 mt-4 border-t border-zinc-800/60 pt-4">
                        {pieData.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                                    <span className="text-zinc-300 font-semibold">{item.name}</span>
                                </div>
                                <span className="text-white font-bold">{item.value} ({Math.round((item.value / tenants.length) * 100)}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RANKING TABLE */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Activity className="text-amber-500" size={18} />
                            Ranking de Barberías por Citas
                        </h3>
                        <p className="text-xs text-zinc-400">Listado de negocios ordenado por volumen total de citas agendadas históricamente en la plataforma.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                                <th className="pb-3 w-16">Puesto</th>
                                <th className="pb-3">Negocio</th>
                                <th className="pb-3 text-center">Plan</th>
                                <th className="pb-3 text-center">Estado</th>
                                <th className="pb-3 text-right">Total Citas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {stats.rankings?.map((tenant, index) => {
                                const isFulanos = tenant.slug === 'fulanos';
                                return (
                                    <tr 
                                        key={tenant.id} 
                                        className={`text-xs hover:bg-zinc-800/20 transition-colors ${
                                            isFulanos ? 'bg-amber-500/5 text-amber-300 font-bold border-l-2 border-amber-500 pl-2' : ''
                                        }`}
                                    >
                                        <td className="py-4 text-zinc-500 font-bold">
                                            #{index + 1}
                                        </td>
                                        <td className="py-4">
                                            <div>
                                                <p className={`font-bold ${isFulanos ? 'text-amber-400' : 'text-white'}`}>
                                                    {tenant.name} {isFulanos && '👑 (Producción)'}
                                                </p>
                                                <p className="text-[10px] text-zinc-500">{tenant.slug}.agendabarber.pro</p>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center">
                                            {getPlanBadge(tenant.plan)}
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                tenant.subscription_status === 'active' 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                                {tenant.subscription_status === 'active' ? 'Activo' : 'Suspendido'}
                                            </span>
                                        </td>
                                        <td className="py-4 text-right font-black text-white text-sm">
                                            {tenant.bookingsCount.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
