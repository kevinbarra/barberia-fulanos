import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const ROOT_DOMAIN = 'agendabarber.pro'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/admin'

    if (code) {
        const supabase = await createClient()
        const { error, data } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.user) {
            const isLocalEnv = process.env.NODE_ENV === 'development'

            // Obtener el tenant del usuario para redirigir al subdominio correcto
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, tenant_id, tenants(slug)')
                .eq('id', data.user.id)
                .single()

            console.log('[Auth Callback] Profile query result:', JSON.stringify({ profile, profileError }))

            // Supabase devuelve tenants como objeto { slug: "..." }
            let tenantSlug: string | null = null

            if (profile?.tenants) {
                // Handle both array and object response from Supabase
                const tenantData = profile.tenants as unknown
                if (Array.isArray(tenantData) && tenantData.length > 0) {
                    tenantSlug = tenantData[0]?.slug || null
                } else if (typeof tenantData === 'object' && tenantData !== null) {
                    tenantSlug = (tenantData as { slug: string }).slug || null
                }
            }

            const userRole = profile?.role
            console.log('[Auth Callback] Extracted:', { tenantSlug, userRole, isLocalEnv })

            // En desarrollo, usar origin normal
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`)
            }

            // En producción, redirigir al subdominio del tenant
            if (tenantSlug) {
                const redirectUrl = `https://${tenantSlug}.${ROOT_DOMAIN}${next}`
                console.log('[Auth Callback] Redirecting to:', redirectUrl)
                return NextResponse.redirect(redirectUrl)
            } else if (userRole === 'super_admin') {
                return NextResponse.redirect(`https://www.${ROOT_DOMAIN}/admin/platform`)
            } else {
                // Fallback: usuario sin tenant va a www
                console.log('[Auth Callback] No tenant found, falling back to www')
                return NextResponse.redirect(`https://www.${ROOT_DOMAIN}/admin`)
            }
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}