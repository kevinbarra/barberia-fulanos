import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    // ========== KIOSK DEBUG LOGGING ==========
    const kioskCookie = request.cookies.get('agendabarber_kiosk_mode')
    console.log(`[KIOSK MIDDLEWARE] URL: ${request.nextUrl.pathname} | Cookie: ${kioskCookie ? 'PRESENTE (' + kioskCookie.value.substring(0, 8) + '...)' : 'AUSENTE'}`)

    // Simplemente delega el trabajo a la función de utilidad
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Coincide con todas las rutas excepto:
         * - _next/static (archivos estáticos)
         * - _next/image (imágenes optimizadas)
         * - favicon.ico (icono)
         * - images, svg, etc.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}