import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Dominios que NO son tenants (se acceden sin tenant context)
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app']
const ROOT_DOMAIN = 'agendabarber.pro'

/**
 * Middleware principal que:
 * 1. Detecta el subdominio (tenant slug)
 * 2. Inyecta x-tenant-slug en los headers
 * 3. Maneja la sesión de Supabase
 */
export async function updateSession(request: NextRequest) {
    // 1. Detectar subdominio
    const hostname = request.headers.get('host') || ''
    const tenantSlug = extractTenantSlug(hostname)

    // 2. Crear headers con tenant info and path info
    const requestHeaders = new Headers(request.headers)
    if (tenantSlug) {
        requestHeaders.set('x-tenant-slug', tenantSlug)
    }
    // Add pathname for server components to detect route
    requestHeaders.set('x-pathname', request.nextUrl.pathname)

    let response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    // Cookie domain for cross-subdomain auth
    const cookieDomain = hostname.includes('agendabarber.pro') ? '.agendabarber.pro' : undefined

    // 3. Manejar sesión Supabase
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: { headers: requestHeaders }
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, {
                            ...options,
                            domain: cookieDomain, // Cross-subdomain sharing
                        })
                    )
                },
            },
        }
    )

    await supabase.auth.getUser()

    // Inyectar tenant slug en response headers también (útil para debugging)
    if (tenantSlug) {
        response.headers.set('x-tenant-slug', tenantSlug)
    }

    return response
}

/**
 * Extrae el slug del tenant desde el hostname
 * Ejemplos:
 * - fulanos.agendabarber.pro -> 'fulanos'
 * - www.agendabarber.pro -> null
 * - agendabarber.pro -> null
 * - localhost:3000 -> null (dev mode, usar user profile)
 */
function extractTenantSlug(hostname: string): string | null {
    // Localhost (desarrollo) - no hay subdominio
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return null
    }

    // Vercel preview URLs (*.vercel.app) - no hay subdominio tenant
    if (hostname.endsWith('.vercel.app')) {
        return null
    }

    // Extraer subdomain de production domain
    const parts = hostname.replace(':443', '').replace(':80', '').split('.')

    // Si tiene formato: subdomain.domain.tld (3+ partes)
    if (parts.length >= 3) {
        const subdomain = parts[0]

        // Verificar que no sea un subdominio reservado
        if (!RESERVED_SUBDOMAINS.includes(subdomain)) {
            return subdomain
        }
    }

    return null
}