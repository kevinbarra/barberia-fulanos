import { createClient } from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function checkAndClaimInvitations() {
    const supabase = await createClient()

    const { data } = await supabase.rpc('claim_invitation')

    // Silently handle - no console output needed in production
    return data;
}

/**
 * AUTO-JOIN TENANT MEMBERSHIP
 * 
 * When a user logs in from a tenant subdomain (e.g., fulanos.agendabarber.pro),
 * automatically create a tenant_members record if they don't have one.
 * 
 * This enables multi-tenancy where users can be members of multiple barber shops.
 * 
 * @param supabase - Supabase client instance
 * @param userId - The authenticated user's ID
 * @param tenantSlug - The subdomain slug (e.g., 'fulanos')
 */
export async function ensureTenantMembership(
    supabase: SupabaseClient,
    userId: string,
    tenantSlug: string | null
) {
    // Ignorar dominios administrativos o vacíos
    if (!tenantSlug) return

    const RESERVED_SLUGS = ['www', 'app', 'admin', 'api', 'localhost']
    if (RESERVED_SLUGS.includes(tenantSlug.toLowerCase())) return

    try {
        // 1. Buscar ID del Tenant por slug
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id, name')
            .eq('slug', tenantSlug)
            .single()

        if (tenantError || !tenant) {
            console.log(`[AUTH] Tenant not found for slug: ${tenantSlug}`)
            return
        }

        // 2. Verificar si ya es miembro (Idempotencia)
        const { data: existingMembership } = await supabase
            .from('tenant_members')
            .select('id')
            .eq('user_id', userId)
            .eq('tenant_id', tenant.id)
            .maybeSingle() // No lanza error si no existe

        // 3. Si no es miembro, crearlo como cliente
        if (!existingMembership) {
            console.log(`[AUTH] Auto-joining user ${userId} to tenant "${tenant.name}" (${tenantSlug})`)

            const { error: insertError } = await supabase
                .from('tenant_members')
                .insert({
                    user_id: userId,
                    tenant_id: tenant.id,
                    role: 'customer', // Default role for auto-join
                    is_active: true
                })

            if (insertError) {
                console.error('[AUTH] Auto-join insert error:', insertError)
            } else {
                console.log(`[AUTH] User ${userId} successfully joined ${tenantSlug}`)
            }
        } else {
            console.log(`[AUTH] User ${userId} already member of ${tenantSlug}`)
        }
    } catch (error) {
        // No bloqueamos el login, solo logueamos el error
        console.error('[AUTH] Auto-join unexpected error:', error)
    }
}