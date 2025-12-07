'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

interface TopServicesChartProps {
    data: Array<{
        service_name: string;
        times_sold: number;
        total_revenue: number;
    }>;
}

export default function TopServicesChart({ data }: TopServicesChartProps) {
    const chartData = data?.slice(0, 6).map(item => ({
        name: item.service_name,
        value: Number(item.total_revenue)
    })) || [];

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Servicios Más Vendidos</h3>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Tabla resumen */}
            <div className="mt-6 space-y-3">
                {data?.slice(0, 5).map((service, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                            <span className="text-gray-700 font-medium">{service.service_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{service.times_sold} ventas</span>
                            <span className="font-bold text-gray-900">
                                ${Number(service.total_revenue).toLocaleString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
