'use client'

import { TopServiceItem } from '@/hooks/useAnalyticsData'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Package, RefreshCw } from 'lucide-react'

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

interface TopServicesChartProps {
    data: TopServiceItem[]
    isLoading?: boolean
    onRefresh?: () => void
}

export default function TopServicesChart({
    data,
    isLoading = false,
    onRefresh
}: TopServicesChartProps) {

    // Chart uses COUNT (times_sold) for popularity, not revenue
    const chartData = data.slice(0, 6).map(item => ({
        name: item.service_name,
        value: item.times_sold,
        revenue: Number(item.total_revenue)
    }))

    // Loading State
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="h-5 w-48 bg-gray-100 rounded mb-6 animate-pulse"></div>
                <div className="h-[300px] bg-gray-50 rounded animate-pulse"></div>
            </div>
        )
    }

    // Empty State
    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Servicios Más Vendidos</h3>
                    {onRefresh && (
                        <button onClick={onRefresh} className="p-2 hover:bg-gray-100 rounded-lg">
                            <RefreshCw className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                </div>
                <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
                    <Package className="w-12 h-12 mb-3 text-gray-200" />
                    <p className="text-sm">Sin servicios vendidos en este período</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Servicios Más Vendidos</h3>
                {onRefresh && (
                    <button onClick={onRefresh} className="p-2 hover:bg-gray-100 rounded-lg">
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                    </button>
                )}
            </div>

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
                        <Tooltip
                            formatter={(value: number, name: string, entry) => [
                                `${value} ventas ($${(entry.payload.revenue || 0).toLocaleString()})`,
                                'Popularidad'
                            ]}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Summary Table */}
            <div className="mt-6 space-y-3">
                {data.slice(0, 5).map((service, idx) => (
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
    )
}
