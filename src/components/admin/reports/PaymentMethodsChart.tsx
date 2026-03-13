'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface PaymentMethodsChartProps {
    data: Array<{ method: string; amount: number }>;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[350px] flex items-center justify-center">
                <p className="text-gray-400 font-medium">No hay datos de pago en este rango</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[350px]">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Métodos de Pago</h3>
            <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="amount"
                            nameKey="method"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value: number) => `$${value.toLocaleString()}`}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
