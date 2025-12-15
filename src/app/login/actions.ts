'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { ROOT_DOMAIN, extractTenantSlug } from '@/lib/constants'

/**
 * Send OTP for login/registration
 * 
 * CRITICAL: Injects tenant_id into user metadata so the database trigger
 * can properly assign new users to the correct tenant.
 * This fixes the "orphan user" problem where users register without a tenant.
 */
export async function sendOtp(email: string) {
    const supabase = await createClient()

    // 1. Extract tenant slug from current subdomain
    const headersList = await headers()
    const hostname = headersList.get('host') || ''
    const tenantSlug = extractTenantSlug(hostname)

    console.log(`[LOGIN] sendOtp called for ${email} on hostname: ${hostname}, tenantSlug: ${tenantSlug || 'none'}`)

    // 2. If on a tenant subdomain, fetch the tenant_id
    let tenantId: string | null = null
    if (tenantSlug) {
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id')
            .eq('slug', tenantSlug)
            .single()

        if (tenantError) {
            console.error(`[LOGIN] Error fetching tenant by slug "${tenantSlug}":`, tenantError)
        } else {
            tenantId = tenant?.id || null
            console.log(`[LOGIN] Resolved tenant_id: ${tenantId}`)
        }
    }

    // 3. Send OTP with tenant metadata
    // The database trigger (handle_new_user) will use this metadata to set profile.tenant_id
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: true,
            data: {
                tenant_id: tenantId,        // Used by trigger to assign user to tenant
                tenant_slug: tenantSlug,    // Useful for debugging/logging
            },
        },
    })

    if (error) {
        console.error('[LOGIN] Error sending OTP:', error)
        return { success: false, error: error.message }
    }

    console.log(`[LOGIN] OTP sent successfully to ${email} with tenant_id: ${tenantId || 'null (root domain)'}`)
    return { success: true }
}

export async function verifyOtp(email: string, token: string, redirectTo?: string) {
    const supabase = await createClient()

    const { error, data } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
    })

    if (error) {
        console.error('Error verificando OTP:', error)
        return { success: false, error: 'Código inválido o expirado', redirectUrl: null }
    }

    // Obtener contexto de subdominio actual
    const headersList = await headers()
    const hostname = headersList.get('host') || ''
    const currentSubdomain = extractTenantSlug(hostname)
    const isProduction = hostname.includes(ROOT_DOMAIN) || hostname.includes('vercel.app')
    const isOnWww = hostname.startsWith('www.')
    const isOnRootOrWww = isOnWww || hostname === ROOT_DOMAIN

    let redirectUrl = '/app' // Default para clientes

    if (data.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id, tenants(slug, subscription_status)')
            .eq('id', data.user.id)
            .single()

        // Extraer datos del perfil
        let userTenantSlug: string | null = null
        let tenantStatus: string = 'active'
        if (profile?.tenants) {
            const tenantData = profile.tenants as unknown
            if (typeof tenantData === 'object' && tenantData !== null) {
                if ('slug' in tenantData) {
                    userTenantSlug = (tenantData as { slug: string }).slug
                }
                if ('subscription_status' in tenantData) {
                    tenantStatus = (tenantData as { subscription_status: string }).subscription_status || 'active'
                }
            }
        }

        const userRole = profile?.role?.trim()
        const isSuperAdmin = userRole === 'super_admin'
        const isStaffOrOwner = userRole === 'owner' || userRole === 'staff'
        const isUserOnOwnTenant = currentSubdomain && currentSubdomain === userTenantSlug

        // CASO 1: Super Admin
        // If on www or root -> go to platform
        // If on a tenant subdomain -> stay on that tenant's admin
        if (isSuperAdmin && isProduction) {
            if (isOnRootOrWww) {
                // Super admin on www -> platform
                redirectUrl = `https://www.${ROOT_DOMAIN}/admin/platform`
            } else if (currentSubdomain) {
                // Super admin on tenant subdomain -> that tenant's admin
                redirectUrl = '/admin'
            } else {
                // Fallback to platform
                redirectUrl = `https://www.${ROOT_DOMAIN}/admin/platform`
            }
        }
        // CASO 2: Staff/Owner en su propio tenant
        else if (isStaffOrOwner && isUserOnOwnTenant) {
            // Verificar si tenant está suspendido
            if (tenantStatus !== 'active') {
                redirectUrl = '/admin' // Mostrará pantalla de suspensión
            } else {
                redirectUrl = '/admin'
            }

        }
        // CASO 3: Staff/Owner pero en OTRO tenant (como cliente)
        else if (isStaffOrOwner && currentSubdomain && !isUserOnOwnTenant) {
            // Están en otro tenant, tratarlos como cliente
            if (redirectTo) {
                redirectUrl = redirectTo
            } else {
                redirectUrl = '/app'
            }

        }
        // CASO 4: Staff/Owner en www o root - ir a su tenant
        else if (isStaffOrOwner && isOnRootOrWww && userTenantSlug && isProduction) {
            if (tenantStatus !== 'active') {
                redirectUrl = `/admin` // Quedarse, mostrará suspensión
            } else {
                redirectUrl = `https://${userTenantSlug}.${ROOT_DOMAIN}/admin`
            }

        }
        // CASO 5: Cliente con redirectTo (venía de booking)
        else if (redirectTo) {
            redirectUrl = redirectTo

        }
        // CASO 6: Cliente default
        else {
            redirectUrl = '/app'

        }
    }


    return { success: true, redirectUrl }
}