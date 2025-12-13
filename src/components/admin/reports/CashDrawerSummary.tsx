'use client'

import { useEffect, useState } from 'react'
import { getTodaysCashDrawer } from '@/app/admin/expenses/actions'
import { Banknote, CreditCard, ArrowRightLeft, Receipt, TrendingUp, Wallet } from 'lucide-react'

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
}

export default function CashDrawerSummary() {
    const [summary, setSummary] = useState<CashDrawerSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            const result = await getTodaysCashDrawer()
            if (result.success && result.summary) {
                setSummary(result.summary)
            } else {
                setError(result.error || 'Error al cargar datos')
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>
                    ))}
                </div>
            </div>
        )
    }

    if (error || !summary) {
        return (
            <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                <p className="text-red-600">{error || 'Error al cargar datos'}</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">Corte de Caja - Hoy</h3>
                        <p className="text-xs text-gray-500">{summary.transactionCount} ventas, {summary.expenseCount} gastos</p>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="space-y-4">
                {/* Income Section */}
                <div className="bg-green-50 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Ingresos
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-lg p-3 text-center">
                            <Banknote className="w-5 h-5 text-green-600 mx-auto mb-1" />
                            <p className="text-lg font-black text-gray-900">${summary.cashIncome.toFixed(0)}</p>
                            <p className="text-xs text-gray-500">Efectivo</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                            <CreditCard className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                            <p className="text-lg font-black text-gray-900">${summary.cardIncome.toFixed(0)}</p>
                            <p className="text-xs text-gray-500">Tarjeta</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                            <ArrowRightLeft className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                            <p className="text-lg font-black text-gray-900">${summary.transferIncome.toFixed(0)}</p>
                            <p className="text-xs text-gray-500">Transf.</p>
                        </div>
                    </div>
                </div>

                {/* Expenses Section */}
                <div className="bg-red-50 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        Salidas de Caja
                    </h4>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600">Gastos en efectivo</span>
                        <span className="text-xl font-black text-red-600">-${summary.cashExpenses.toFixed(0)}</span>
                    </div>
                </div>

                {/* Cash in Drawer - MAIN METRIC */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-300 font-medium">💵 EFECTIVO EN CAJÓN</p>
                            <p className="text-xs text-gray-400 mt-1">
                                ${summary.cashIncome.toFixed(0)} ingresos - ${summary.cashExpenses.toFixed(0)} gastos
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-black">${summary.cashInDrawer.toFixed(0)}</p>
                        </div>
                    </div>
                </div>

                {/* Net Balance */}
                <div className="flex items-center justify-between py-3 border-t border-gray-100">
                    <span className="text-gray-600 font-medium">Balance Neto del Día</span>
                    <span className={`text-xl font-black ${summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${summary.netBalance.toFixed(0)}
                    </span>
                </div>
            </div>
        </div>
    )
}
