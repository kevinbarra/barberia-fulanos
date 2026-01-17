'use client'

import { StaffBreakdownData } from '@/hooks/useAnalyticsData'
import { Users, Banknote, CreditCard, ArrowRightLeft, RefreshCw } from 'lucide-react'

interface StaffFinanceTableProps {
    data: StaffBreakdownData | null
    isLoading?: boolean
    onRefresh?: () => void
}

export default function StaffFinanceTable({
    data,
    isLoading = false,
    onRefresh
}: StaffFinanceTableProps) {
    const breakdown = data?.breakdown || []
    const totals = data?.totals || { cash: 0, card: 0, transfer: 0, total: 0 }

    // Loading State
    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-6 animate-pulse">
                    <div className="h-5 w-40 bg-gray-100 rounded mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-14 bg-gray-50 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // Empty State
    if (breakdown.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">Sin transacciones por barbero</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Corte por Barbero</h3>
                        <p className="text-xs text-gray-500">{breakdown.length} barbero{breakdown.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Barbero
                            </th>
                            <th className="text-right px-4 py-3">
                                <div className="flex items-center justify-end gap-1.5">
                                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Efectivo</span>
                                </div>
                            </th>
                            <th className="text-right px-4 py-3">
                                <div className="flex items-center justify-end gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarjeta</span>
                                </div>
                            </th>
                            <th className="text-right px-4 py-3">
                                <div className="flex items-center justify-end gap-1.5">
                                    <ArrowRightLeft className="w-3.5 h-3.5 text-violet-600" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transfer</span>
                                </div>
                            </th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {breakdown.map((staff) => (
                            <tr key={staff.staffId} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                            <span className="text-sm font-semibold text-gray-600">
                                                {staff.staffName.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="font-medium text-gray-900">{staff.staffName}</span>
                                    </div>
                                </td>
                                <td className="text-right px-4 py-4">
                                    <span className={`font-mono font-medium ${staff.cash > 0 ? 'text-emerald-700 bg-emerald-50 px-2 py-1 rounded' : 'text-gray-400'}`}>
                                        ${staff.cash.toLocaleString()}
                                    </span>
                                </td>
                                <td className="text-right px-4 py-4">
                                    <span className={`font-mono font-medium ${staff.card > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                                        ${staff.card.toLocaleString()}
                                    </span>
                                </td>
                                <td className="text-right px-4 py-4">
                                    <span className={`font-mono font-medium ${staff.transfer > 0 ? 'text-violet-700' : 'text-gray-400'}`}>
                                        ${staff.transfer.toLocaleString()}
                                    </span>
                                </td>
                                <td className="text-right px-6 py-4">
                                    <span className="font-mono font-bold text-gray-900">
                                        ${staff.total.toLocaleString()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {/* Footer with Totals */}
                    <tfoot>
                        <tr className="bg-gray-900 text-white">
                            <td className="px-6 py-4 font-semibold">
                                TOTALES
                            </td>
                            <td className="text-right px-4 py-4">
                                <span className="font-mono font-bold text-emerald-300">
                                    ${totals.cash.toLocaleString()}
                                </span>
                            </td>
                            <td className="text-right px-4 py-4">
                                <span className="font-mono font-bold text-blue-300">
                                    ${totals.card.toLocaleString()}
                                </span>
                            </td>
                            <td className="text-right px-4 py-4">
                                <span className="font-mono font-bold text-violet-300">
                                    ${totals.transfer.toLocaleString()}
                                </span>
                            </td>
                            <td className="text-right px-6 py-4">
                                <span className="font-mono font-bold text-xl">
                                    ${totals.total.toLocaleString()}
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    )
}
