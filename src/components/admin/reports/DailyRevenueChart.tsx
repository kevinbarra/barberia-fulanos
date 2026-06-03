'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface DailyRevenueItem {
    day: string;
    revenue: number;
    bookings: number;
}

interface DailyRevenueChartProps {
    data: DailyRevenueItem[];
}

export default function DailyRevenueChart({ data }: DailyRevenueChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[380px] flex flex-col items-center justify-center">
                <p className="text-gray-400 font-semibold">No hay ventas registradas en este período</p>
                <p className="text-xs text-gray-400 mt-1">Las ventas e ingresos de citas completadas aparecerán aquí</p>
            </div>
        );
    }

    const formatXAxis = (dateStr: string) => {
        try {
            const date = parseISO(dateStr);
            return format(date, 'd MMM', { locale: es });
        } catch {
            return dateStr;
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            let dateLabel = label;
            try {
                dateLabel = format(parseISO(label), "EEEE d 'de' MMMM, yyyy", { locale: es });
            } catch {}

            return (
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xl space-y-1.5">
                    <p className="text-xs font-semibold text-gray-400 capitalize">{dateLabel}</p>
                    <div className="flex items-center gap-6 justify-between">
                        <span className="text-sm font-medium text-gray-600">Ventas:</span>
                        <span className="text-sm font-black text-gray-900">
                            ${Number(payload[0].value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    {payload[1] && (
                        <div className="flex items-center gap-6 justify-between">
                            <span className="text-sm font-medium text-gray-600">Citas:</span>
                            <span className="text-sm font-bold text-indigo-600">
                                {payload[1].value}
                            </span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    // Calculate total revenue and average bookings
    const totalRev = data.reduce((acc, curr) => acc + Number(curr.revenue), 0);
    const totalBookings = data.reduce((acc, curr) => acc + Number(curr.bookings), 0);

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-[380px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                <div>
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Tendencia de Ventas Diarias</h3>
                    <p className="text-xs font-medium text-gray-400 mt-0.5">Evolución de ingresos y volumen de citas</p>
                </div>
                <div className="flex gap-4">
                    <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Ingreso Período</span>
                        <p className="text-lg font-black text-gray-900 leading-none mt-0.5">
                            ${totalRev.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="border-l border-gray-100 pl-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Citas Totales</span>
                        <p className="text-lg font-black text-indigo-600 leading-none mt-0.5">{totalBookings}</p>
                    </div>
                </div>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                            dataKey="day"
                            tickFormatter={formatXAxis}
                            fontSize={10}
                            fontWeight={600}
                            stroke="#9ca3af"
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            fontSize={10}
                            fontWeight={600}
                            stroke="#9ca3af"
                            tickFormatter={(v) => `$${v}`}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#6366f1"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                            name="Ventas"
                        />
                        <Area
                            type="monotone"
                            dataKey="bookings"
                            stroke="#818cf8"
                            strokeWidth={0}
                            fillOpacity={0}
                            name="Citas"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
