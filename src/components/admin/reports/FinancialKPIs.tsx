'use client';

import { TrendingUp, TrendingDown, DollarSign, Percent, Check, Clock } from 'lucide-react';

interface FinancialKPIsProps {
    data: {
        total_revenue: number;
        total_transactions: number;
        avg_transaction_value: number;
        unique_clients: number;
        previous_revenue: number;
        growth_rate: number;
    };
}

const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
};

export default function FinancialKPIs({ data }: FinancialKPIsProps) {
    const kpis = [
        {
            title: 'Ventas Totales',
            value: `$${data?.total_revenue?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) ?? '0.00'}`,
            change: data?.growth_rate || 0,
            icon: DollarSign,
            color: 'blue'
        },
        {
            title: 'Recaudado',
            value: `$${(data as any)?.total_collected?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) ?? '0.00'}`,
            change: null,
            icon: Check,
            color: 'green'
        },
        {
            title: 'Pendiente',
            value: `$${(data as any)?.total_pending?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) ?? '0.00'}`,
            change: null,
            icon: Clock,
            color: 'amber'
        },
        {
            title: 'Ticket Promedio',
            value: `$${data?.avg_transaction_value?.toFixed(2) ?? '0.00'}`,
            change: null,
            icon: Percent,
            color: 'purple'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi) => {
                const Icon = kpi.icon;
                const isPositive = kpi.change !== null && kpi.change >= 0;
                const colors = colorMap[kpi.color] || { bg: 'bg-gray-100', text: 'text-gray-600' };

                return (
                    <div
                        key={kpi.title}
                        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                <Icon className={`w-6 h-6 ${colors.text}`} />
                            </div>
                            {kpi.change !== null && kpi.change !== 0 && (
                                <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    {Math.abs(kpi.change).toFixed(1)}%
                                </div>
                            )}
                        </div>
                        <h3 className="text-gray-600 text-sm font-medium mb-1">{kpi.title}</h3>
                        <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                    </div>
                );
            })}
        </div>
    );
}
