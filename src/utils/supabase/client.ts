import { createBrowserClient } from '@supabase/ssr'

// Cookie domain for cross-subdomain auth
const COOKIE_DOMAIN = typeof window !== 'undefined' && window.location.hostname.includes('agendabarber.pro')
    ? '.agendabarber.pro'
    : undefined

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: {
                domain: COOKIE_DOMAIN,
            },
        }
    )
}