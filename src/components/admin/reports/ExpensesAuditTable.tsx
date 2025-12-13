'use client'

import { useEffect, useState } from 'react'
import { getExpensesByDateRange } from '@/app/admin/expenses/actions'
import { Receipt, Clock, User, DollarSign, AlertCircle } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

type Expense = {
    id: string
    amount: number
    description: string
    payment_method: string
    created_at: string
    // Supabase returns this as array for foreign key joins
    profiles: { full_name: string }[] | { full_name: string } | null
}

export default function ExpensesAuditTable() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            const today = new Date()
            const result = await getExpensesByDateRange(startOfDay(today), endOfDay(today))
            if (result.success && result.expenses) {
                setExpenses(result.expenses as unknown as Expense[])
                setError(null)
            } else {
                setError(result.error || 'Error al cargar gastos')
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    // Loading State
    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="h-5 w-40 bg-gray-100 rounded mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-gray-50 rounded-lg"></div>
                    ))}
                </div>
            </div>
        )
    }

    // Error State
    if (error) {
        return (
            <div className="bg-white rounded-2xl border border-red-100 p-6">
                <div className="flex items-center gap-3 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        )
    }

    // Empty State
    if (expenses.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Receipt className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">Sin gastos registrados hoy</p>
            </div>
        )
    }

    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-rose-600" />
                    <h3 className="font-semibold text-gray-900">Gastos de Hoy</h3>
                    <span className="text-xs text-gray-400">({expenses.length})</span>
                </div>
                <span className="font-mono font-semibold text-rose-600">
                    -${totalAmount.toLocaleString()}
                </span>
            </div>

            {/* Table */}
            <div className="divide-y divide-gray-50">
                {expenses.map((expense) => (
                    <div key={expense.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                        {/* Time */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 w-16 flex-shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(expense.created_at), 'HH:mm', { locale: es })}
                        </div>

                        {/* Description */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{expense.description}</p>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <User className="w-3 h-3" />
                                {Array.isArray(expense.profiles)
                                    ? expense.profiles[0]?.full_name || 'Usuario'
                                    : expense.profiles?.full_name || 'Usuario'}
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right flex-shrink-0">
                            <p className="font-mono font-medium text-gray-900">
                                ${Number(expense.amount).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">
                                {expense.payment_method === 'cash' ? 'Efectivo' :
                                    expense.payment_method === 'card' ? 'Tarjeta' : 'Transfer.'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
