'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WeekdayTrendsChartProps {
    data: Array<{
        weekday: string;
        avg_revenue: number;
        total_transactions: number;
    }>;
}

export default function WeekdayTrendsChart({ data }: WeekdayTrendsChartProps) {
    // Traducir días si vienen en inglés desde DB (depende de configuración de Postgres, mejor asegurar)
    const translateDay = (day: string) => {
        const map: Record<string, string> = {
            'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mié',
            'Thursday': 'Jue', 'Friday': 'Vie', 'Saturday': 'Sáb', 'Sunday': 'Dom'
        };
        return map[day.trim()] || day.substring(0, 3);
    };

    const chartData = data?.map(item => ({
        name: translateDay(item.weekday),
        revenue: Number(item.avg_revenue),
        count: Number(item.total_transactions)
    })) || [];

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">Tendencias por Día</h3>
                <p className="text-sm text-gray-500">Ingreso promedio por día de la semana (Últimos 3 meses)</p>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip
                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Promedio']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Insight */}
            <div className="mt-4 bg-purple-50 p-3 rounded-lg flex items-start gap-2">
                <span className="text-lg">💡</span>
                <div>
                    <p className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-0.5">Insight Operativo</p>
                    <p className="text-sm text-purple-700 leading-snug">
                        El día con mayor ingreso promedio es <strong>{chartData.sort((a, b) => b.revenue - a.revenue)[0]?.name || 'N/A'}</strong>.
                        Considera aumentar personal este día para maximizar la ocupación.
                    </p>
                </div>
            </div>
        </div>
    );
}
