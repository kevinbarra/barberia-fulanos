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
    Loader2
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
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

    const activeCount = tenants.filter(t => t.subscription_status === 'active').length;
    const suspendedCount = tenants.filter(t => t.subscription_status === 'suspended').length;
    const activeRate = tenants.length ? Math.round((activeCount / tenants.length) * 100) : 0;

    return (
        <div className="space-y-8">
            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Ingresos Totales */}
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
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                        <TrendingUp size={12} /> +{stats.revenueTrend}% <span className="text-zinc-500 font-medium">vs mes ant.</span>
                    </div>
                </div>

                {/* Reservas Globales */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Reservas Totales</p>
                            <h4 className="text-2xl font-black text-white">{stats.monthlyBookings.toLocaleString()}</h4>
                        </div>
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <Calendar size={18} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                        <TrendingUp size={12} /> +{stats.bookingTrend}% <span className="text-zinc-500 font-medium">vs mes ant.</span>
                    </div>
                </div>

                {/* Tasa de Retención */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Salud del Negocio</p>
                            <h4 className="text-2xl font-black text-white">{activeRate}% <span className="text-xs text-zinc-500 font-medium">Activos</span></h4>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <Percent size={18} />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-zinc-400 font-semibold flex gap-2">
                        <span>{activeCount} activos</span> • <span>{suspendedCount} suspendidos</span>
                    </div>
                </div>

                {/* Total Tenants */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">Barberías Totales</p>
                            <h4 className="text-2xl font-black text-white">{tenants.length}</h4>
                        </div>
                        <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20">
                            <Building2 size={18} />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-zinc-400 font-semibold">
                        Registro histórico global
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
        </div>
    );
}
