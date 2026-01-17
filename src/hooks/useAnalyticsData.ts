'use client'

import { useEffect, useState, useCallback } from 'react'
import {
    getCashDrawerByDateRange,
    getStaffFinancialBreakdown,
    getExpensesByDateRange,
    getDynamicStaffRevenue,
    getDynamicTopServices
} from '@/app/admin/expenses/actions'

// ==================== TYPES ====================

export type CashDrawerData = {
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

export type StaffBreakdownItem = {
    staffId: string
    staffName: string
    cash: number
    card: number
    transfer: number
    total: number
}

export type StaffBreakdownData = {
    breakdown: StaffBreakdownItem[]
    totals: { cash: number; card: number; transfer: number; total: number }
}

export type ExpenseItem = {
    id: string
    amount: number
    description: string
    payment_method: string
    created_at: string
    profiles: { full_name: string }[] | { full_name: string } | null
}

export type StaffRevenueItem = {
    staff_name: string
    total_revenue: number
    total_services: number
    avg_service_value: number
}

export type TopServiceItem = {
    service_name: string
    times_sold: number
    total_revenue: number
}

export interface AnalyticsClientData {
    cashDrawer: CashDrawerData | null
    staffBreakdown: StaffBreakdownData | null
    expenses: ExpenseItem[]
    staffRevenue: StaffRevenueItem[]
    topServices: TopServiceItem[]
}

interface UseAnalyticsDataProps {
    startISO?: string | null
    endISO?: string | null
    startDate?: string | null
    endDate?: string | null
}

interface UseAnalyticsDataReturn {
    data: AnalyticsClientData
    isLoading: boolean
    error: string | null
    refresh: () => void
}

// ==================== HOOK ====================

export function useAnalyticsData({
    startISO,
    endISO,
    startDate,
    endDate
}: UseAnalyticsDataProps): UseAnalyticsDataReturn {
    const [data, setData] = useState<AnalyticsClientData>({
        cashDrawer: null,
        staffBreakdown: null,
        expenses: [],
        staffRevenue: [],
        topServices: []
    })
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAllData = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Parse dates for expenses query
            let queryStart: Date
            let queryEnd: Date

            if (startISO && endISO) {
                queryStart = new Date(startISO)
                queryEnd = new Date(endISO)
            } else if (startDate && endDate) {
                queryStart = new Date(startDate)
                queryEnd = new Date(endDate)
            } else {
                const today = new Date()
                queryStart = new Date(today.setHours(0, 0, 0, 0))
                queryEnd = new Date(today.setHours(23, 59, 59, 999))
            }

            // Parallel fetch all 5 data sources
            const [
                cashDrawerResult,
                staffBreakdownResult,
                expensesResult,
                staffRevenueResult,
                topServicesResult
            ] = await Promise.all([
                getCashDrawerByDateRange(startISO || undefined, endISO || undefined),
                getStaffFinancialBreakdown(startISO || undefined, endISO || undefined),
                getExpensesByDateRange(queryStart, queryEnd),
                getDynamicStaffRevenue(startISO || undefined, endISO || undefined),
                getDynamicTopServices(startISO || undefined, endISO || undefined)
            ])

            setData({
                cashDrawer: cashDrawerResult.success ? cashDrawerResult.summary || null : null,
                staffBreakdown: staffBreakdownResult.success ? {
                    breakdown: staffBreakdownResult.breakdown || [],
                    totals: staffBreakdownResult.totals || { cash: 0, card: 0, transfer: 0, total: 0 }
                } : null,
                expenses: expensesResult.success ? (expensesResult.expenses as unknown as ExpenseItem[]) || [] : [],
                staffRevenue: staffRevenueResult.success ? staffRevenueResult.data || [] : [],
                topServices: topServicesResult.success ? topServicesResult.data || [] : []
            })

        } catch (err) {
            console.error('[useAnalyticsData] Error:', err)
            setError(err instanceof Error ? err.message : 'Error al cargar datos')
        } finally {
            setIsLoading(false)
        }
    }, [startISO, endISO, startDate, endDate])

    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])

    return {
        data,
        isLoading,
        error,
        refresh: fetchAllData
    }
}
