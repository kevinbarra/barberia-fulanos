'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HourlyHeatmapProps {
    data: Array<{
        hour: number;
        avg_revenue: number;
        transaction_count: number;
    }>;
}

export default function HourlyHeatmap({ data }: HourlyHeatmapProps) {
    // Rellenar horas faltantes (0-23) para tener el día completo o al menos horario laboral (8-21)
    const fullData = Array.from({ length: 14 }, (_, i) => {
        const hour = i + 8; // 8 AM to 9 PM
        const found = data?.find(d => d.hour === hour);
        return {
            hourLabel: `${hour}:00`,
            hour,
            transactions: Number(found?.transaction_count || 0),
            intensity: Number(found?.transaction_count || 0)
        };
    });

    // Encontrar el máximo para calcular intensidad de color
    const maxTransactions = Math.max(...fullData.map(d => d.transactions));

    const getColor = (value: number) => {
        if (value === 0) return '#f3f4f6'; // gris claro (vacío)
        const intensity = value / (maxTransactions || 1);
        if (intensity < 0.3) return '#c4b5fd'; // violeta muy claro
        if (intensity < 0.6) return '#8b5cf6'; // violeta medio
        return '#5b21b6'; // violeta oscuro (muy concurrido)
    };

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">Horarios Más Concurridos</h3>
                <p className="text-sm text-gray-500">Intensidad basada en número de visitas promedio</p>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fullData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="hourLabel" axisLine={false} tickLine={false} fontSize={12} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm">
                                            <p className="font-bold mb-1">{data.hourLabel}</p>
                                            <p className="text-gray-600">
                                                {data.transactions === 0 ? 'Generalmente vacío' : `${data.transactions} visitas promedio`}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="transactions" radius={[4, 4, 0, 0]}>
                            {fullData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColor(entry.transactions)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-[#f3f4f6]"></div>
                    <span>Vacío</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-[#c4b5fd]"></div>
                    <span>Bajo</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-[#8b5cf6]"></div>
                    <span>Medio</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-[#5b21b6]"></div>
                    <span>Alto</span>
                </div>
            </div>
        </div>
    );
}
