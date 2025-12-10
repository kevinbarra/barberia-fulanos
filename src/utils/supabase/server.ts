import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cookie domain for cross-subdomain auth
const COOKIE_DOMAIN = process.env.NODE_ENV === 'production' ? '.agendabarber.pro' : undefined

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (cookieStore as any).set(name, value, {
                                ...options,
                                domain: COOKIE_DOMAIN, // Cross-subdomain sharing
                            })
                        )
                    } catch {
                        // El método setAll fue llamado desde un Server Component.
                    }
                },
            },
        }
    )
}

// --- FUNCIÓN UTILITARIA (Vital para tu app) ---
// Esta función es usada en AdminDashboard, Bookings, etc.
export async function getTenantId() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    return profile?.tenant_id
}