import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: {
                // Asegura que la cookie funcione en todos los subdominios
                domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.agendabarber.pro',
            },
            auth: {
                persistSession: true,         // 🔐 CLAVE: Guarda la sesión en localStorage/Cookies
                autoRefreshToken: true,       // 🔄 CLAVE: Renueva el token silenciosamente antes de que expire
                detectSessionInUrl: true,     // Detecta el link mágico
                flowType: 'pkce',             // Estándar de seguridad moderno
            },
        }
    )
}