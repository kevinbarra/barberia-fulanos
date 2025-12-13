'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { startOfDay, endOfDay, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { headers } from 'next/headers'

const TIMEZONE = 'America/Mexico_City'

// ==================== HELPER: Get Secure Tenant ID ====================
// Uses admin client to bypass RLS and guarantee profile resolution
// Handles super_admin/owner accounts with NULL tenant_id via dynamic fallback
async function getSecureTenantId(): Promise<{ tenantId: string | null; userId: string | null; userRole?: string; error?: string }> {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        console.error('[getSecureTenantId] Auth error:', authError)
        return { tenantId: null, userId: null, error: 'No autorizado - sesión inválida' }
    }

    // 2. Use ADMIN CLIENT to get profile (bypasses RLS completely)
    const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

    if (profileError) {
        console.error(`[getSecureTenantId] Profile error for User ID: ${user.id}`, profileError)
        return { tenantId: null, userId: user.id, error: `Perfil no encontrado para User ID: ${user.id}` }
    }

    const userRole = profile?.role || 'customer'
    const isPrivilegedUser = userRole === 'super_admin' || userRole === 'owner' || userRole === 'admin'

    // 3. For privileged users on a subdomain, resolve tenant from hostname FIRST
    const headersList = await headers()
    const hostname = headersList.get('host') || ''
    const parts = hostname.replace(':443', '').replace(':80', '').split('.')
    const reservedSubdomains = ['www', 'api', 'admin', 'app', 'localhost']

    if (parts.length >= 3 || hostname.includes('localhost')) {
        const subdomain = parts[0]

        if (!reservedSubdomains.includes(subdomain) && subdomain !== 'localhost') {
            const { data: tenant } = await adminClient
                .from('tenants')
                .select('id')
                .eq('slug', subdomain)
                .single()

            if (tenant?.id) {
                console.log(`[getSecureTenantId] Resolved tenant from subdomain: ${subdomain}`)
                return { tenantId: tenant.id, userId: user.id, userRole }
            }
        }
    }

    // 4. If profile has tenant_id, use it
    if (profile?.tenant_id) {
        return { tenantId: profile.tenant_id, userId: user.id, userRole }
    }

    // 5. FALLBACK for privileged users with NULL tenant_id: find their owned tenant
    if (isPrivilegedUser && !profile?.tenant_id) {
        console.log(`[getSecureTenantId] Privileged user ${user.id} has NULL tenant_id, searching for owned tenant...`)

        // Try to find a tenant owned by this user
        const { data: ownedTenant } = await adminClient
            .from('tenants')
            .select('id, slug')
            .eq('owner_id', user.id)
            .limit(1)
            .single()

        if (ownedTenant?.id) {
            console.log(`[getSecureTenantId] Found owned tenant: ${ownedTenant.slug}`)
            return { tenantId: ownedTenant.id, userId: user.id, userRole }
        }

        // For super_admin without owned tenant, try first active tenant as fallback
        if (userRole === 'super_admin') {
            const { data: anyTenant } = await adminClient
                .from('tenants')
                .select('id, slug')
                .eq('subscription_status', 'active')
                .limit(1)
                .single()

            if (anyTenant?.id) {
                console.log(`[getSecureTenantId] Super admin fallback to first active tenant: ${anyTenant.slug}`)
                return { tenantId: anyTenant.id, userId: user.id, userRole }
            }
        }

        // If still no tenant found, return error
        console.error(`[getSecureTenantId] No tenant found for privileged user: ${user.id}`)
        return { tenantId: null, userId: user.id, userRole, error: 'No se encontró ningún negocio asociado. Contacta soporte.' }
    }

    // 6. For non-privileged users without tenant_id, this is an error
    console.error(`[getSecureTenantId] No tenant_id for non-privileged User ID: ${user.id}`)
    return { tenantId: null, userId: user.id, userRole, error: 'Usuario sin negocio asignado. Contacta soporte.' }
}

// ==================== CREATE EXPENSE ====================
export async function createExpense(data: {
    amount: number;
    description: string;
    paymentMethod?: string;
}) {
    try {
        // 1. Get secure tenant context
        const { tenantId, userId, error: authError } = await getSecureTenantId()

        if (authError || !tenantId || !userId) {
            console.error('[createExpense] Auth error:', authError)
            return { error: authError || 'Error de autenticación' }
        }

        // 2. Validate input
        const amount = Number(data.amount)
        if (isNaN(amount) || amount <= 0) {
            return { error: 'El monto debe ser mayor a 0' }
        }

        const description = data.description?.trim()
        if (!description) {
            return { error: 'La descripción es requerida' }
        }

        const paymentMethod = data.paymentMethod || 'cash'
        if (!['cash', 'card', 'transfer'].includes(paymentMethod)) {
            return { error: 'Método de pago inválido' }
        }

        // 3. Insert expense using admin client to bypass RLS issues
        const adminClient = createAdminClient()
        const { error: insertError } = await adminClient
            .from('expenses')
            .insert({
                tenant_id: tenantId,
                amount: amount,
                description: description,
                payment_method: paymentMethod,
                created_by: userId,
                created_at: new Date().toISOString()
            })

        if (insertError) {
            console.error('[createExpense] Insert error:', insertError)
            return { error: `Error al registrar: ${insertError.message}` }
        }

        revalidatePath('/admin/expenses')
        revalidatePath('/admin/reports')

        return { success: true, message: 'Gasto registrado correctamente' }
    } catch (err) {
        console.error('[createExpense] Unexpected error:', err)
        return { error: 'Error inesperado del servidor' }
    }
}

// ==================== GET EXPENSES BY DATE RANGE ====================
export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
    try {
        const { tenantId, error: authError } = await getSecureTenantId()

        if (authError || !tenantId) {
            return { error: authError || 'No autorizado', expenses: [] }
        }

        const adminClient = createAdminClient()
        const { data: expenses, error } = await adminClient
            .from('expenses')
            .select('id, amount, description, payment_method, created_at, profiles:created_by(full_name)')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[getExpensesByDateRange] Error:', error)
            return { error: 'Error al obtener gastos', expenses: [] }
        }

        return { success: true, expenses: expenses || [] }
    } catch (err) {
        console.error('[getExpensesByDateRange] Unexpected error:', err)
        return { error: 'Error del servidor', expenses: [] }
    }
}

// ==================== GET TODAY'S CASH DRAWER SUMMARY ====================
export async function getTodaysCashDrawer() {
    try {
        const { tenantId, error: authError } = await getSecureTenantId()

        if (authError || !tenantId) {
            return { error: authError || 'No autorizado' }
        }

        // Calculate today's date range in Mexico City timezone
        // This is the correct approach: get "today" in local TZ, then query
        const now = new Date()
        const localNow = toZonedTime(now, TIMEZONE)
        const todayStr = format(localNow, 'yyyy-MM-dd')

        // Create UTC boundaries for "today" in Mexico City
        // Mexico City is UTC-6, so:
        // - Start of day (00:00 Mexico) = 06:00 UTC
        // - End of day (23:59 Mexico) = 05:59 UTC next day
        const todayStart = new Date(`${todayStr}T00:00:00-06:00`)
        const todayEnd = new Date(`${todayStr}T23:59:59.999-06:00`)

        console.log('[getTodaysCashDrawer] Date range:', {
            todayStr,
            todayStart: todayStart.toISOString(),
            todayEnd: todayEnd.toISOString()
        })

        const adminClient = createAdminClient()

        // Get today's transactions (income)
        const { data: transactions, error: txError } = await adminClient
            .from('transactions')
            .select('amount, payment_method')
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString())

        if (txError) {
            console.error('[getTodaysCashDrawer] Transaction error:', txError)
            return { error: 'Error al obtener transacciones' }
        }

        // Get today's expenses
        const { data: expenses, error: expError } = await adminClient
            .from('expenses')
            .select('amount, payment_method')
            .eq('tenant_id', tenantId)
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString())

        if (expError) {
            console.error('[getTodaysCashDrawer] Expense error:', expError)
            return { error: 'Error al obtener gastos' }
        }

        // Calculate totals with COALESCE-like behavior (default to 0)
        type TransactionItem = { amount: number | string | null; payment_method?: string | null }

        const safeSum = (arr: TransactionItem[] | null, filter?: (item: TransactionItem) => boolean) => {
            const items = arr || []
            const filtered = filter ? items.filter(filter) : items
            return filtered.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
        }

        const cashIncome = safeSum(transactions, t => t.payment_method === 'cash')
        const cardIncome = safeSum(transactions, t => t.payment_method === 'card')
        const transferIncome = safeSum(transactions, t => t.payment_method === 'transfer')
        const totalIncome = cashIncome + cardIncome + transferIncome

        const cashExpenses = safeSum(expenses, e => e.payment_method === 'cash')
        const totalExpenses = safeSum(expenses)

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
                expenseCount: expenses?.length || 0,
                dateRange: todayStr
            }
        }
    } catch (err) {
        console.error('[getTodaysCashDrawer] Unexpected error:', err)
        return { error: 'Error del servidor' }
    }
}

// ==================== GET CASH DRAWER BY DATE RANGE ====================
// Accepts explicit ISO date strings for timezone-aware queries
export async function getCashDrawerByDateRange(startISO?: string, endISO?: string) {
    try {
        const { tenantId, error: authError } = await getSecureTenantId()

        if (authError || !tenantId) {
            return { error: authError || 'No autorizado' }
        }

        // If no dates provided, default to today in Mexico City
        let dateStart: Date
        let dateEnd: Date
        let dateLabel: string

        if (startISO && endISO) {
            // Use explicit dates from frontend (already timezone-adjusted)
            dateStart = new Date(startISO)
            dateEnd = new Date(endISO)
            dateLabel = `${format(dateStart, 'yyyy-MM-dd')} - ${format(dateEnd, 'yyyy-MM-dd')}`
        } else {
            // Default to today in Mexico City
            const now = new Date()
            const localNow = toZonedTime(now, TIMEZONE)
            const todayStr = format(localNow, 'yyyy-MM-dd')
            dateStart = new Date(`${todayStr}T00:00:00-06:00`)
            dateEnd = new Date(`${todayStr}T23:59:59.999-06:00`)
            dateLabel = todayStr
        }

        console.log('[getCashDrawerByDateRange] Query range:', {
            dateStart: dateStart.toISOString(),
            dateEnd: dateEnd.toISOString()
        })

        const adminClient = createAdminClient()

        // Get transactions (income)
        const { data: transactions, error: txError } = await adminClient
            .from('transactions')
            .select('amount, payment_method')
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .gte('created_at', dateStart.toISOString())
            .lte('created_at', dateEnd.toISOString())

        if (txError) {
            console.error('[getCashDrawerByDateRange] Transaction error:', txError)
            return { error: 'Error al obtener transacciones' }
        }

        // Get expenses
        const { data: expenses, error: expError } = await adminClient
            .from('expenses')
            .select('amount, payment_method')
            .eq('tenant_id', tenantId)
            .gte('created_at', dateStart.toISOString())
            .lte('created_at', dateEnd.toISOString())

        if (expError) {
            console.error('[getCashDrawerByDateRange] Expense error:', expError)
            return { error: 'Error al obtener gastos' }
        }

        // Calculate totals
        type TransactionItem = { amount: number | string | null; payment_method?: string | null }

        const safeSum = (arr: TransactionItem[] | null, filter?: (item: TransactionItem) => boolean) => {
            const items = arr || []
            const filtered = filter ? items.filter(filter) : items
            return filtered.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
        }

        const cashIncome = safeSum(transactions, t => t.payment_method === 'cash')
        const cardIncome = safeSum(transactions, t => t.payment_method === 'card')
        const transferIncome = safeSum(transactions, t => t.payment_method === 'transfer')
        const totalIncome = cashIncome + cardIncome + transferIncome

        const cashExpenses = safeSum(expenses, e => e.payment_method === 'cash')
        const totalExpenses = safeSum(expenses)

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
                expenseCount: expenses?.length || 0,
                dateRange: dateLabel
            }
        }
    } catch (err) {
        console.error('[getCashDrawerByDateRange] Unexpected error:', err)
        return { error: 'Error del servidor' }
    }
}

// ==================== GET STAFF FINANCIAL BREAKDOWN ====================
// Returns earnings grouped by staff member and payment method for a date range
export async function getStaffFinancialBreakdown(startISO?: string, endISO?: string) {
    try {
        const { tenantId, error: authError } = await getSecureTenantId()

        if (authError || !tenantId) {
            console.error('[getStaffFinancialBreakdown] Auth error:', authError)
            return { success: false, error: authError || 'No autorizado', breakdown: [], totals: { cash: 0, card: 0, transfer: 0, total: 0 }, staffCount: 0 }
        }

        // If no dates provided, default to today in Mexico City
        let dateStart: Date
        let dateEnd: Date

        if (startISO && endISO) {
            dateStart = new Date(startISO)
            dateEnd = new Date(endISO)
        } else {
            const now = new Date()
            const localNow = toZonedTime(now, TIMEZONE)
            const todayStr = format(localNow, 'yyyy-MM-dd')
            dateStart = new Date(`${todayStr}T00:00:00-06:00`)
            dateEnd = new Date(`${todayStr}T23:59:59.999-06:00`)
        }

        console.log('[getStaffFinancialBreakdown] Query range:', {
            tenantId,
            dateStart: dateStart.toISOString(),
            dateEnd: dateEnd.toISOString()
        })

        const adminClient = createAdminClient()

        // Step 1: Get transactions with booking info (simpler query)
        const { data: transactions, error: txError } = await adminClient
            .from('transactions')
            .select(`
                id,
                amount, 
                payment_method,
                booking_id
            `)
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .gte('created_at', dateStart.toISOString())
            .lte('created_at', dateEnd.toISOString())

        if (txError) {
            console.error('[getStaffFinancialBreakdown] Transaction query error:', txError)
            return { success: false, error: `Error en transacciones: ${txError.message}`, breakdown: [], totals: { cash: 0, card: 0, transfer: 0, total: 0 }, staffCount: 0 }
        }

        if (!transactions || transactions.length === 0) {
            console.log('[getStaffFinancialBreakdown] No transactions found')
            return { success: true, breakdown: [], totals: { cash: 0, card: 0, transfer: 0, total: 0 }, staffCount: 0 }
        }

        // Step 2: Get unique booking IDs and fetch booking+staff info
        const bookingIds = [...new Set(transactions.map(t => t.booking_id).filter(Boolean))]

        if (bookingIds.length === 0) {
            console.log('[getStaffFinancialBreakdown] No booking IDs found')
            return { success: true, breakdown: [], totals: { cash: 0, card: 0, transfer: 0, total: 0 }, staffCount: 0 }
        }

        const { data: bookings, error: bookingError } = await adminClient
            .from('bookings')
            .select(`
                id,
                staff_id
            `)
            .in('id', bookingIds)

        if (bookingError) {
            console.error('[getStaffFinancialBreakdown] Bookings query error:', bookingError)
            return { success: false, error: `Error en bookings: ${bookingError.message}`, breakdown: [], totals: { cash: 0, card: 0, transfer: 0, total: 0 }, staffCount: 0 }
        }

        // Step 3: Get unique staff IDs and fetch names
        const staffIds = [...new Set(bookings?.map(b => b.staff_id).filter(Boolean) || [])]

        const { data: staffProfiles, error: profileError } = await adminClient
            .from('profiles')
            .select('id, full_name')
            .in('id', staffIds)

        if (profileError) {
            console.error('[getStaffFinancialBreakdown] Profiles query error:', profileError)
            // Continue without names - not a critical failure
        }

        // Build lookup maps
        const bookingToStaff = new Map<string, string>()
        for (const b of bookings || []) {
            if (b.id && b.staff_id) bookingToStaff.set(b.id, b.staff_id)
        }

        const staffNames = new Map<string, string>()
        for (const p of staffProfiles || []) {
            if (p.id && p.full_name) staffNames.set(p.id, p.full_name)
        }

        // Step 4: Group by staff member
        type StaffBreakdown = {
            staffId: string
            staffName: string
            cash: number
            card: number
            transfer: number
            total: number
        }

        const staffMap = new Map<string, StaffBreakdown>()

        // IMPORTANT: Include ALL transactions, even those without booking_id
        // Orphan transactions (no booking) go to "Ventas Rápidas" category
        const ORPHAN_KEY = '__ORPHAN__'

        for (const tx of transactions) {
            const staffId = tx.booking_id ? bookingToStaff.get(tx.booking_id) : null

            // Use staffId if found, otherwise use ORPHAN_KEY for transactions without booking
            const finalKey = staffId || ORPHAN_KEY
            const staffName = staffId ? (staffNames.get(staffId) || 'Sin nombre') : 'Ventas Rápidas'

            if (!staffMap.has(finalKey)) {
                staffMap.set(finalKey, {
                    staffId: finalKey,
                    staffName,
                    cash: 0,
                    card: 0,
                    transfer: 0,
                    total: 0
                })
            }

            const staffData = staffMap.get(finalKey)!
            const amount = Number(tx.amount) || 0
            // Default to 'cash' if payment_method is null/undefined
            const paymentMethod = tx.payment_method || 'cash'

            if (paymentMethod === 'cash') staffData.cash += amount
            else if (paymentMethod === 'card') staffData.card += amount
            else if (paymentMethod === 'transfer') staffData.transfer += amount
            else staffData.cash += amount // Default fallback

            staffData.total += amount
        }

        const breakdown = Array.from(staffMap.values()).sort((a, b) => b.total - a.total)

        // Calculate totals
        const totals = breakdown.reduce((acc, staff) => ({
            cash: acc.cash + staff.cash,
            card: acc.card + staff.card,
            transfer: acc.transfer + staff.transfer,
            total: acc.total + staff.total
        }), { cash: 0, card: 0, transfer: 0, total: 0 })

        console.log('[getStaffFinancialBreakdown] Success:', { staffCount: breakdown.length, totalRevenue: totals.total })

        return {
            success: true,
            breakdown,
            totals,
            staffCount: breakdown.length
        }
    } catch (err) {
        console.error('[getStaffFinancialBreakdown] Unexpected error:', err)
        return { success: false, error: 'Error del servidor', breakdown: [], totals: { cash: 0, card: 0, transfer: 0, total: 0 }, staffCount: 0 }
    }
}

// ==================== GET DYNAMIC STAFF REVENUE ====================
// Replaces staff_revenue_report view with direct transaction query
export async function getDynamicStaffRevenue(startISO?: string, endISO?: string) {
    try {
        const { tenantId, error: authError } = await getSecureTenantId()

        if (authError || !tenantId) {
            return { success: false, error: authError || 'No autorizado', data: [] }
        }

        // Default to today if no dates
        let dateStart: Date
        let dateEnd: Date

        if (startISO && endISO) {
            dateStart = new Date(startISO)
            dateEnd = new Date(endISO)
        } else {
            const now = new Date()
            const localNow = toZonedTime(now, TIMEZONE)
            const todayStr = format(localNow, 'yyyy-MM-dd')
            dateStart = new Date(`${todayStr}T00:00:00-06:00`)
            dateEnd = new Date(`${todayStr}T23:59:59.999-06:00`)
        }

        const adminClient = createAdminClient()

        // Get transactions with booking info
        const { data: transactions, error: txError } = await adminClient
            .from('transactions')
            .select('id, amount, booking_id')
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .gte('created_at', dateStart.toISOString())
            .lte('created_at', dateEnd.toISOString())

        if (txError) {
            console.error('[getDynamicStaffRevenue] Transaction error:', txError)
            return { success: false, error: txError.message, data: [] }
        }

        if (!transactions || transactions.length === 0) {
            return { success: true, data: [] }
        }

        // Get bookings for staff mapping
        const bookingIds = [...new Set(transactions.map(t => t.booking_id).filter(Boolean))]

        const { data: bookings } = await adminClient
            .from('bookings')
            .select('id, staff_id')
            .in('id', bookingIds)

        // Get staff names
        const staffIds = [...new Set(bookings?.map(b => b.staff_id).filter(Boolean) || [])]

        const { data: staffProfiles } = await adminClient
            .from('profiles')
            .select('id, full_name')
            .in('id', staffIds)

        // Build lookup maps
        const bookingToStaff = new Map<string, string>()
        for (const b of bookings || []) {
            if (b.id && b.staff_id) bookingToStaff.set(b.id, b.staff_id)
        }

        const staffNames = new Map<string, string>()
        for (const p of staffProfiles || []) {
            if (p.id && p.full_name) staffNames.set(p.id, p.full_name)
        }

        // Aggregate by staff - INCLUDE ORPHAN TRANSACTIONS
        const staffMap = new Map<string, { revenue: number; services: number }>()
        const ORPHAN_KEY = '__ORPHAN__'

        for (const tx of transactions) {
            const staffId = tx.booking_id ? bookingToStaff.get(tx.booking_id) : null
            const finalKey = staffId || ORPHAN_KEY

            if (!staffMap.has(finalKey)) {
                staffMap.set(finalKey, { revenue: 0, services: 0 })
            }

            const data = staffMap.get(finalKey)!
            data.revenue += Number(tx.amount) || 0
            data.services += 1
        }

        const result = Array.from(staffMap.entries())
            .map(([staffId, data]) => ({
                staff_name: staffId === ORPHAN_KEY ? 'Ventas Rápidas' : (staffNames.get(staffId) || 'Sin nombre'),
                total_revenue: data.revenue,
                total_services: data.services,
                avg_service_value: data.services > 0 ? Math.round(data.revenue / data.services) : 0
            }))
            .sort((a, b) => b.total_revenue - a.total_revenue)

        return { success: true, data: result }
    } catch (err) {
        console.error('[getDynamicStaffRevenue] Unexpected error:', err)
        return { success: false, error: 'Error del servidor', data: [] }
    }
}

// ==================== GET DYNAMIC TOP SERVICES ====================
// Replaces top_services_report view with direct transaction query
export async function getDynamicTopServices(startISO?: string, endISO?: string) {
    try {
        const { tenantId, error: authError } = await getSecureTenantId()

        if (authError || !tenantId) {
            return { success: false, error: authError || 'No autorizado', data: [] }
        }

        // Default to today if no dates
        let dateStart: Date
        let dateEnd: Date

        if (startISO && endISO) {
            dateStart = new Date(startISO)
            dateEnd = new Date(endISO)
        } else {
            const now = new Date()
            const localNow = toZonedTime(now, TIMEZONE)
            const todayStr = format(localNow, 'yyyy-MM-dd')
            dateStart = new Date(`${todayStr}T00:00:00-06:00`)
            dateEnd = new Date(`${todayStr}T23:59:59.999-06:00`)
        }

        const adminClient = createAdminClient()

        // Get transactions with booking info
        const { data: transactions, error: txError } = await adminClient
            .from('transactions')
            .select('id, amount, booking_id')
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .gte('created_at', dateStart.toISOString())
            .lte('created_at', dateEnd.toISOString())

        if (txError) {
            console.error('[getDynamicTopServices] Transaction error:', txError)
            return { success: false, error: txError.message, data: [] }
        }

        if (!transactions || transactions.length === 0) {
            return { success: true, data: [] }
        }

        // Get bookings for service mapping
        const bookingIds = [...new Set(transactions.map(t => t.booking_id).filter(Boolean))]

        const { data: bookings } = await adminClient
            .from('bookings')
            .select('id, service_id')
            .in('id', bookingIds)

        // Get service names
        const serviceIds = [...new Set(bookings?.map(b => b.service_id).filter(Boolean) || [])]

        const { data: services } = await adminClient
            .from('services')
            .select('id, name')
            .in('id', serviceIds)

        // Build lookup maps
        const bookingToService = new Map<string, string>()
        for (const b of bookings || []) {
            if (b.id && b.service_id) bookingToService.set(b.id, b.service_id)
        }

        const serviceNames = new Map<string, string>()
        for (const s of services || []) {
            if (s.id && s.name) serviceNames.set(s.id, s.name)
        }

        // Aggregate by service - INCLUDE ORPHAN TRANSACTIONS
        const serviceMap = new Map<string, { revenue: number; count: number }>()
        const ORPHAN_KEY = '__ORPHAN__'

        for (const tx of transactions) {
            const serviceId = tx.booking_id ? bookingToService.get(tx.booking_id) : null
            const finalKey = serviceId || ORPHAN_KEY

            if (!serviceMap.has(finalKey)) {
                serviceMap.set(finalKey, { revenue: 0, count: 0 })
            }

            const data = serviceMap.get(finalKey)!
            data.revenue += Number(tx.amount) || 0
            data.count += 1
        }

        const result = Array.from(serviceMap.entries())
            .map(([serviceId, data]) => ({
                service_name: serviceId === ORPHAN_KEY ? 'Ventas Generales' : (serviceNames.get(serviceId) || 'Servicio desconocido'),
                total_revenue: data.revenue,
                times_sold: data.count
            }))
            .sort((a, b) => b.total_revenue - a.total_revenue)
            .slice(0, 10)

        return { success: true, data: result }
    } catch (err) {
        console.error('[getDynamicTopServices] Unexpected error:', err)
        return { success: false, error: 'Error del servidor', data: [] }
    }
}
