'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StaffRevenueChartProps {
    data: Array<{
        staff_name: string;
        total_revenue: number;
        total_services: number;
        avg_service_value: number;
    }>;
}

export default function StaffRevenueChart({ data }: StaffRevenueChartProps) {
    const chartData = data?.map(item => ({
        name: item.staff_name,
        revenue: Number(item.total_revenue),
        servicios: item.total_services
    })) || [];

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue por Barbero</h3>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip
                            formatter={(value: number, name: string) => {
                                if (name === 'Revenue') {
                                    return [`$${value.toLocaleString()}`, 'Revenue'];
                                }
                                return [value, 'Servicios'];
                            }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="servicios" fill="#ec4899" name="Servicios" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
