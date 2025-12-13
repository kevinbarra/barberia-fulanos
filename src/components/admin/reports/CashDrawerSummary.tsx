'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCashDrawerByDateRange } from '@/app/admin/expenses/actions'
import {
    Banknote,
    CreditCard,
    ArrowRightLeft,
    Receipt,
    TrendingUp,
    Wallet,
    RefreshCw,
    AlertCircle,
    Calendar
} from 'lucide-react'
import { format, parseISO, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'

type CashDrawerSummary = {
    cashIncome: number
    cardIncome: number
    transferIncome: number
    totalIncome: number
    cashExpenses: number
    totalExpenses: number
    cashInDrawer: number
    netBalance: number
    transactionCount: number
    expenseCount: number
    dateRange?: string
}

export default function CashDrawerSummary() {
    const searchParams = useSearchParams()
    const [summary, setSummary] = useState<CashDrawerSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [dateLabel, setDateLabel] = useState<string>('')

    const fetchData = async () => {
        // Get dates from URL params
        const startISO = searchParams.get('startISO')
        const endISO = searchParams.get('endISO')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        // Calculate display label
        if (startDate && endDate) {
            const start = parseISO(startDate)
            const end = parseISO(endDate)
            if (isSameDay(start, end)) {
                setDateLabel(format(start, "EEEE d 'de' MMMM", { locale: es }))
            } else {
                setDateLabel(`${format(start, "d MMM", { locale: es })} - ${format(end, "d MMM yyyy", { locale: es })}`)
            }
        } else {
            setDateLabel(format(new Date(), "EEEE d 'de' MMMM", { locale: es }))
        }

        const result = await getCashDrawerByDateRange(startISO || undefined, endISO || undefined)
        if (result.success && result.summary) {
            setSummary(result.summary)
            setError(null)
        } else {
            setError(result.error || 'Error al cargar datos')
        }
        setLoading(false)
        setRefreshing(false)
    }

    useEffect(() => {
        setLoading(true)
        fetchData()
    }, [searchParams])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchData()
    }

    // Loading State
    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl"></div>
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-gray-100 rounded"></div>
                                <div className="h-3 w-24 bg-gray-50 rounded"></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 pt-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-gray-50 rounded-xl"></div>
                            ))}
                        </div>
                        <div className="h-24 bg-gray-100 rounded-xl"></div>
                    </div>
                </div>
            </div>
        )
    }

    // Error State
    if (error) {
        return (
            <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center gap-3 text-red-600">
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-medium">Error al cargar datos</p>
                            <p className="text-sm text-red-500">{error}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="mt-4 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        )
    }

    // Empty State
    if (!summary || (summary.transactionCount === 0 && summary.expenseCount === 0)) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Wallet className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">Sin movimientos</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto">
                        No hay ingresos ni gastos en el período seleccionado
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Corte de Caja</h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span className="capitalize">{dateLabel}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="p-6 space-y-5">
                {/* Income Breakdown */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Ingresos ({summary.transactionCount} ventas)
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Banknote className="w-4 h-4 text-emerald-600" />
                            </div>
                            <p className="text-lg font-mono font-semibold text-gray-900">
                                ${summary.cashIncome.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">Efectivo</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <CreditCard className="w-4 h-4 text-blue-600" />
                            </div>
                            <p className="text-lg font-mono font-semibold text-gray-900">
                                ${summary.cardIncome.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">Tarjeta</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <ArrowRightLeft className="w-4 h-4 text-violet-600" />
                            </div>
                            <p className="text-lg font-mono font-semibold text-gray-900">
                                ${summary.transferIncome.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">Transfer</p>
                        </div>
                    </div>
                </div>

                {/* Expenses */}
                {summary.expenseCount > 0 && (
                    <div className="bg-rose-50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-rose-600" />
                                <span className="text-sm text-rose-700 font-medium">
                                    Gastos ({summary.expenseCount})
                                </span>
                            </div>
                            <span className="text-lg font-mono font-semibold text-rose-700">
                                -${summary.cashExpenses.toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}

                {/* Cash in Drawer - Hero Metric */}
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-gray-400 font-medium mb-1">
                                💵 Efectivo en Cajón
                            </p>
                            <p className="text-4xl font-mono font-bold tracking-tight">
                                ${summary.cashInDrawer.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                ${summary.cashIncome.toLocaleString()} ingresado − ${summary.cashExpenses.toLocaleString()} gastado
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                            <Banknote className="w-6 h-6 text-white/80" />
                        </div>
                    </div>
                </div>

                {/* Summary Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-600">Balance Neto</span>
                    <span className={`text-xl font-mono font-bold ${summary.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {summary.netBalance >= 0 ? '+' : ''}${summary.netBalance.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    )
}
