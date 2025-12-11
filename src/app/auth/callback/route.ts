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

            if (tenantSlug) {
                const redirectUrl = `https://${tenantSlug}.${ROOT_DOMAIN}${next}`
                return NextResponse.redirect(redirectUrl)
            } else if (userRole === 'super_admin') {
                return NextResponse.redirect(`https://www.${ROOT_DOMAIN}/admin/platform`)
            } else {
                return NextResponse.redirect(`https://www.${ROOT_DOMAIN}/admin`)
            }
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}