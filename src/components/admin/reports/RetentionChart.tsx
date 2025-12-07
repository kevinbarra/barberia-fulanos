'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RetentionChartProps {
    data: Array<{
        month: string;
        retention_rate: number;
        total_clients: number;
        returning_clients: number;
    }>;
}

export default function RetentionChart({ data }: RetentionChartProps) {
    const chartData = data ? [...data].reverse().map(item => ({
        month: new Date(item.month).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        tasa: Number(item.retention_rate),
        total: item.total_clients,
        recurrentes: item.returning_clients
    })) : [];

    const lastMonth = chartData.length > 0 ? chartData[chartData.length - 1] : null;

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Retención de Clientes</h3>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="tasa"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6 }}
                            name="Tasa de Retención (%)"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Stats adicionales */}
            {lastMonth && (
                <div className="mt-8 grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
                    <div className="text-center">
                        <p className="text-3xl font-black text-purple-600 tracking-tight">
                            {lastMonth.tasa.toFixed(1)}%
                        </p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Retención Actual</p>
                    </div>
                    <div className="text-center border-l border-gray-100">
                        <p className="text-3xl font-black text-gray-900 tracking-tight">
                            {lastMonth.total}
                        </p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Clientes Totales</p>
                    </div>
                    <div className="text-center border-l border-gray-100">
                        <p className="text-3xl font-black text-green-600 tracking-tight">
                            {lastMonth.recurrentes}
                        </p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Clientes Recurrentes</p>
                    </div>
                </div>
            )}
        </div>
    );
}
