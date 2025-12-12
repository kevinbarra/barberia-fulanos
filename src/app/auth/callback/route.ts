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
            const isOnWww = hostname.startsWith('www.') || hostname === ROOT_DOMAIN

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, tenant_id, tenants(slug)')
                .eq('id', data.user.id)
                .single()

            let tenantSlug: string | null = null

            if (profile?.tenants) {
                const tenantData = profile.tenants as unknown
                if (Array.isArray(tenantData) && tenantData.length > 0) {
                    tenantSlug = tenantData[0]?.slug || null
                } else if (typeof tenantData === 'object' && tenantData !== null) {
                    tenantSlug = (tenantData as { slug: string }).slug || null
                }
            }

            const userRole = profile?.role

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`)
            }

            // Super admin: respect subdomain context
            if (userRole === 'super_admin') {
                if (currentSubdomain && !isOnWww) {
                    // Super admin on tenant subdomain -> stay there
                    return NextResponse.redirect(`https://${currentSubdomain}.${ROOT_DOMAIN}${next}`)
                } else {
                    // Super admin on www -> go to platform
                    return NextResponse.redirect(`https://www.${ROOT_DOMAIN}/admin/platform`)
                }
            }

            // Regular users
            if (tenantSlug) {
                const redirectUrl = `https://${tenantSlug}.${ROOT_DOMAIN}${next}`
                return NextResponse.redirect(redirectUrl)
            } else {
                return NextResponse.redirect(`https://www.${ROOT_DOMAIN}/admin`)
            }
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}