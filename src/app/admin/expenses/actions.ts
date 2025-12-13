'use server'

import { createClient, getTenantIdForAdmin } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { startOfDay, endOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/Mexico_City'

// ==================== CREATE EXPENSE ====================
export async function createExpense(data: {
    amount: number;
    description: string;
    paymentMethod?: string;
}) {
    const supabase = await createClient()

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // 2. Get tenant ID (works for subdomain context)
    const tenantId = await getTenantIdForAdmin()
    if (!tenantId) return { error: 'Error de configuración de cuenta.' }

    // 3. Validate amount
    if (!data.amount || data.amount <= 0) {
        return { error: 'El monto debe ser mayor a 0' }
    }

    if (!data.description?.trim()) {
        return { error: 'La descripción es requerida' }
    }

    // 4. Insert expense
    const { error } = await supabase
        .from('expenses')
        .insert({
            tenant_id: tenantId,
            amount: data.amount,
            description: data.description.trim(),
            payment_method: data.paymentMethod || 'cash',
            created_by: user.id
        })

    if (error) {
        console.error('Error creating expense:', error)
        return { error: 'Error al registrar el gasto' }
    }

    revalidatePath('/admin/expenses')
    revalidatePath('/admin/reports')

    return { success: true, message: 'Gasto registrado correctamente' }
}

// ==================== GET EXPENSES BY DATE RANGE ====================
export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
    const supabase = await createClient()

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado', expenses: [] }

    // 2. Get tenant ID
    const tenantId = await getTenantIdForAdmin()
    if (!tenantId) return { error: 'Error de configuración', expenses: [] }

    // 3. Query expenses
    const { data: expenses, error } = await supabase
        .from('expenses')
        .select('id, amount, description, payment_method, created_at, profiles:created_by(full_name)')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching expenses:', error)
        return { error: 'Error al obtener gastos', expenses: [] }
    }

    return { success: true, expenses: expenses || [] }
}

// ==================== GET TODAY'S CASH DRAWER SUMMARY ====================
export async function getTodaysCashDrawer() {
    const supabase = await createClient()

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // 2. Get tenant ID
    const tenantId = await getTenantIdForAdmin()
    if (!tenantId) return { error: 'Error de configuración' }

    // 3. Calculate today's date range in local timezone
    const now = new Date()
    const todayStart = fromZonedTime(startOfDay(toZonedTime(now, TIMEZONE)), TIMEZONE)
    const todayEnd = fromZonedTime(endOfDay(toZonedTime(now, TIMEZONE)), TIMEZONE)

    // 4. Get today's transactions (income)
    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount, payment_method')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString())

    if (txError) {
        console.error('Error fetching transactions:', txError)
        return { error: 'Error al obtener transacciones' }
    }

    // 5. Get today's expenses
    const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('amount, payment_method')
        .eq('tenant_id', tenantId)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString())

    if (expError) {
        console.error('Error fetching expenses:', expError)
        return { error: 'Error al obtener gastos' }
    }

    // 6. Calculate totals
    const cashIncome = (transactions || [])
        .filter(t => t.payment_method === 'cash')
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const cardIncome = (transactions || [])
        .filter(t => t.payment_method === 'card')
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const transferIncome = (transactions || [])
        .filter(t => t.payment_method === 'transfer')
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalIncome = cashIncome + cardIncome + transferIncome

    const cashExpenses = (expenses || [])
        .filter(e => e.payment_method === 'cash')
        .reduce((sum, e) => sum + Number(e.amount), 0)

    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0)

    const cashInDrawer = cashIncome - cashExpenses
    const netBalance = totalIncome - totalExpenses

    return {
        success: true,
        summary: {
            cashIncome,
            cardIncome,
            transferIncome,
            totalIncome,
            cashExpenses,
            totalExpenses,
            cashInDrawer,
            netBalance,
            transactionCount: transactions?.length || 0,
            expenseCount: expenses?.length || 0
        }
    }
}
