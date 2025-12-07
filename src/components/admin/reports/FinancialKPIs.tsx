'use client';

import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, Percent } from 'lucide-react';

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

export default function FinancialKPIs({ data }: FinancialKPIsProps) {
    const kpis = [
        {
            title: 'Revenue Total',
            value: `$${data?.total_revenue?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) ?? '0.00'}`,
            change: data?.growth_rate || 0,
            icon: DollarSign,
            color: 'blue'
        },
        {
            title: 'Transacciones',
            value: (data?.total_transactions || 0).toString(),
            change: null,
            icon: ShoppingCart,
            color: 'green'
        },
        {
            title: 'Ticket Promedio',
            value: `$${data?.avg_transaction_value?.toFixed(2) ?? '0.00'}`,
            change: null,
            icon: Percent,
            color: 'purple'
        },
        {
            title: 'Clientes Únicos',
            value: (data?.unique_clients || 0).toString(),
            change: null,
            icon: Users,
            color: 'pink'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi) => {
                const Icon = kpi.icon;
                const isPositive = kpi.change !== null && kpi.change >= 0;

                return (
                    <div
                        key={kpi.title}
                        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-lg bg-${kpi.color}-100 flex items-center justify-center`}>
                                <Icon className={`w-6 h-6 text-${kpi.color}-600`} />
                            </div>
                            {kpi.change !== null && (
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
