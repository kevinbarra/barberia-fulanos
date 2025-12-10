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
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, tenant_id, tenants(slug)')
                .eq('id', data.user.id)
                .single()

            const tenantData = profile?.tenants as unknown as { slug: string } | null
            const tenantSlug = tenantData?.slug
            const userRole = profile?.role

            // En desarrollo, usar origin normal
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`)
            }

            // En producción, redirigir al subdominio del tenant
            if (tenantSlug) {
                // Usuario pertenece a un tenant → redirigir a su subdominio
                return NextResponse.redirect(`https://${tenantSlug}.${ROOT_DOMAIN}${next}`)
            } else if (userRole === 'super_admin') {
                // Super admin sin tenant → ir al dominio principal
                return NextResponse.redirect(`https://www.${ROOT_DOMAIN}/admin/platform`)
            } else {
                // Usuario sin tenant (cliente genérico) → app principal
                return NextResponse.redirect(`https://www.${ROOT_DOMAIN}/app`)
            }
        }
    }

    // Si algo falla, lo regresamos al login con error
    return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}