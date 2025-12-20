import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROOT_DOMAIN, RESERVED_SUBDOMAINS, COOKIE_DOMAIN } from '@/lib/constants'

// 🔓 RUTAS PÚBLICAS: No requieren sesión, no ejecutar auto-heal
const PUBLIC_ROUTES = [
    '/login',
    '/auth',
    '/forgot-password',
    '/reset-password',
    '/book',
    '/onboarding',
    '/api',
    '/_next',
    '/favicon',
    '/manifest',
]

/**
 * Middleware principal que:
 * 1. Detecta el subdominio (tenant slug)
 * 2. Inyecta x-tenant-slug en los headers
 * 3. Maneja la sesión de Supabase con refresh automático
 * 4. Protege rutas /admin y previene login loops
 */
export async function updateSession(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // 🔓 BYPASS: Si es ruta pública, no hacer validación de tokens
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

    // 1. Detectar subdominio
    const hostname = request.headers.get('host') || ''
    const tenantSlug = extractTenantSlug(hostname)

    // 2. Crear headers con tenant info and path info
    const requestHeaders = new Headers(request.headers)
    if (tenantSlug) {
        requestHeaders.set('x-tenant-slug', tenantSlug)
    }
    // Add pathname for server components to detect route
    requestHeaders.set('x-pathname', pathname)

    let response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    // Cookie domain for cross-subdomain auth (uses constant from lib/constants.ts)
    const cookieDomain = hostname.includes(ROOT_DOMAIN) ? COOKIE_DOMAIN : undefined
    const isProduction = process.env.NODE_ENV === 'production'

    // 3. Manejar sesión Supabase con refresh automático
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
                            secure: isProduction,
                            sameSite: 'lax',
                            httpOnly: true,
                        })
                    )
                },
            },
        }
    )

    // ⚠️ LÍNEA MÁGICA: getUser() refresca el token si es necesario
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // 🛡️ AUTO-HEAL: Solo para tokens ESPECÍFICAMENTE corruptos/reutilizados
    // IMPORTANTE: 
    // - NO ejecutar en rutas públicas (evita login loop)
    // - NO ejecutar para "Auth session missing" (es estado normal sin sesión)
    // - SOLO ejecutar para refresh token específicamente corrupto
    if (authError && !isPublicRoute) {
        const errorMessage = authError.message || '';

        // Solo estos errores específicos indican un token corrupto que necesita limpieza
        const isRefreshTokenCorrupt =
            authError.code === 'refresh_token_already_used' ||
            errorMessage.includes('Refresh Token') ||
            errorMessage.includes('Invalid Refresh Token') ||
            errorMessage.includes('refresh_token_not_found');

        // "Auth session missing" NO es un error de token corrupto - es simplemente no tener sesión
        const isJustMissingSession = errorMessage.includes('session missing');

        if (isRefreshTokenCorrupt && !isJustMissingSession) {
            console.error('[MIDDLEWARE] Refresh token corrupt, clearing session:', authError.message);

            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('error', 'session_expired');

            const clearResponse = NextResponse.redirect(loginUrl);

            // Borrar todas las cookies de Supabase
            request.cookies.getAll().forEach(cookie => {
                if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
                    clearResponse.cookies.set(cookie.name, '', {
                        expires: new Date(0),
                        path: '/',
                        domain: cookieDomain,
                    });
                }
            });

            return clearResponse;
        }
    }

    // 4. Protección de Rutas (evitar loops)
    // Si intenta acceder a /admin sin usuario, redirigir a login
    // PERO: excluir rutas públicas y API
    if (pathname.startsWith('/admin') && !user) {
        // Evitar loop infinito: si ya viene de login con noredirect, no redirigir
        if (!request.nextUrl.searchParams.has('noredirect')) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('noredirect', '1')
            return NextResponse.redirect(url)
        }
    }

    // Inyectar tenant slug en response headers también (útil para debugging)
    if (tenantSlug) {
        response.headers.set('x-tenant-slug', tenantSlug)
    }

    return response
}

/**
 * Extrae el slug del tenant desde el hostname
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