import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // 1. Crear una respuesta inicial
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 2. Configurar el cliente de Supabase
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // Leer cookies de la petición
                getAll() {
                    return request.cookies.getAll()
                },
                // Escribir cookies en la respuesta (y en la petición para que sigan disponibles)
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 3. Refrescar la sesión si es necesario
    // IMPORTANTE: Esto actualiza la cookie si el token está por vencer
    await supabase.auth.getUser()

    return response
}