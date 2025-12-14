import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

const ROOT_DOMAIN = 'agendabarber.pro'
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app']

function extractTenantFromHostname(hostname: string): string | null {
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return null
    }
    if (hostname.endsWith('.vercel.app')) {
        return null
    }
    const parts = hostname.replace(':443', '').replace(':80', '').split('.')
    if (parts.length >= 3) {
        const subdomain = parts[0]
        if (!RESERVED_SUBDOMAINS.includes(subdomain)) {
            return subdomain
        }
    }
    return null
}

/**
 * POST-LOGIN REDIRECT FLOW
 * 
 * Uses new multi-tenant structure:
 * - profiles.is_platform_admin -> /admin-saas
 * - tenant_members table for user-tenant relationships
 * 
 * Routing Rules:
 * A) Platform Admin: /admin-saas
 * B) No memberships: /onboarding
 * C) 1 membership: https://{slug}.agendabarber.pro/admin
 * D) 2+ memberships: /select-account
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/admin'

    if (code) {
        const supabase = await createClient()
        const { error, data } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.user) {
            const isLocalEnv = process.env.NODE_ENV === 'development'

            // Get hostname context
            const headersList = await headers()
            const hostname = headersList.get('host') || ''
            const currentSubdomain = extractTenantFromHostname(hostname)

            // ========== STEP 1: Check if Platform Admin ==========
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_platform_admin')
                .eq('id', data.user.id)
                .single()

            // CASE A: Platform Admin -> /admin-saas
            if (profile?.is_platform_admin === true) {
                console.log('[Auth Callback] Platform Admin detected, redirecting to /admin-saas')
                if (isLocalEnv) {
                    return NextResponse.redirect(`${origin}/admin-saas`)
                }
                return NextResponse.redirect(`https://www.${ROOT_DOMAIN}/admin-saas`)
            }

            // ========== STEP 2: Get User's Tenant Memberships ==========
            const { data: memberships } = await supabase
                .from('tenant_members')
                .select(`
                    tenant_id,
                    role,
                    tenants(slug, name)
                `)
                .eq('user_id', data.user.id)
                .eq('is_active', true)

            // CASE B: No memberships -> /onboarding
            if (!memberships || memberships.length === 0) {
                console.log('[Auth Callback] No tenant memberships, redirecting to /onboarding')
                if (isLocalEnv) {
                    return NextResponse.redirect(`${origin}/onboarding`)
                }
                return NextResponse.redirect(`https://www.${ROOT_DOMAIN}/onboarding`)
            }

            // ========== STEP 3: Route Based on Membership Count ==========

            // If user is on a specific subdomain, check if they have access
            if (currentSubdomain) {
                const hasAccessToCurrentTenant = memberships.some(m => {
                    const tenant = m.tenants as unknown as { slug: string } | null
                    return tenant?.slug === currentSubdomain
                })

                if (hasAccessToCurrentTenant) {
                    console.log(`[Auth Callback] User has access to ${currentSubdomain}, staying`)
                    if (isLocalEnv) {
                        return NextResponse.redirect(`${origin}${next}`)
                    }
                    return NextResponse.redirect(`https://${currentSubdomain}.${ROOT_DOMAIN}${next}`)
                }
            }

            // CASE C: Single membership -> Redirect to that tenant's subdomain
            if (memberships.length === 1) {
                const tenant = memberships[0].tenants as unknown as { slug: string } | null
                const slug = tenant?.slug

                if (slug) {
                    console.log(`[Auth Callback] Single tenant: ${slug}, redirecting`)
                    if (isLocalEnv) {
                        // In dev, simulate with console log and redirect to /admin
                        console.log(`[DEV] Would redirect to: https://${slug}.${ROOT_DOMAIN}/admin`)
                        return NextResponse.redirect(`${origin}/admin`)
                    }
                    return NextResponse.redirect(`https://${slug}.${ROOT_DOMAIN}/admin`)
                }
            }

            // CASE D: Multiple memberships -> /select-account
            console.log(`[Auth Callback] Multiple tenants (${memberships.length}), redirecting to /select-account`)
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}/select-account`)
            }
            return NextResponse.redirect(`https://www.${ROOT_DOMAIN}/select-account`)
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}