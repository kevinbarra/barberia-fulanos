'use client'

import { StaffRevenueItem } from '@/hooks/useAnalyticsData'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Users, RefreshCw } from 'lucide-react'

interface StaffRevenueChartProps {
    data: StaffRevenueItem[]
    isLoading?: boolean
    onRefresh?: () => void
}

export default function StaffRevenueChart({
    data,
    isLoading = false,
    onRefresh
}: StaffRevenueChartProps) {

    const chartData = data.map(item => ({
        name: item.staff_name,
        revenue: Number(item.total_revenue),
        servicios: item.total_services
    }))

    // Loading State
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="h-5 w-40 bg-gray-100 rounded mb-6 animate-pulse"></div>
                <div className="h-[300px] bg-gray-50 rounded animate-pulse"></div>
            </div>
        )
    }

    // Empty State
    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Revenue por Barbero</h3>
                    {onRefresh && (
                        <button onClick={onRefresh} className="p-2 hover:bg-gray-100 rounded-lg">
                            <RefreshCw className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                </div>
                <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
                    <Users className="w-12 h-12 mb-3 text-gray-200" />
                    <p className="text-sm">Sin datos de ventas en este período</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Revenue por Barbero</h3>
                {onRefresh && (
                    <button onClick={onRefresh} className="p-2 hover:bg-gray-100 rounded-lg">
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                    </button>
                )}
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip
                            formatter={(value: number, name: string) => {
                                if (name === 'Revenue') {
                                    return [`$${value.toLocaleString()}`, 'Revenue']
                                }
                                return [value, 'Servicios']
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
    )
}
