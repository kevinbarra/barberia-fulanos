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
