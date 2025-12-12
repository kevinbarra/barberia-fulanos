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

// --- FUNCIÓN PARA ADMIN PAGES (Soporta Super Admin) ---
// Para super admin, obtiene tenant del subdomain en vez del profile
import { headers } from 'next/headers'

const ROOT_DOMAIN = 'agendabarber.pro'
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app']

function extractTenantFromHostname(hostname: string): string | null {
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) return null
    if (hostname.endsWith('.vercel.app')) return null
    const parts = hostname.replace(':443', '').replace(':80', '').split('.')
    if (parts.length >= 3) {
        const subdomain = parts[0]
        if (!RESERVED_SUBDOMAINS.includes(subdomain)) return subdomain
    }
    return null
}

export async function getTenantIdForAdmin(): Promise<string | null> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

    const isSuperAdmin = profile?.role === 'super_admin'

    // For super admin, get tenant from subdomain
    if (isSuperAdmin) {
        const headersList = await headers()
        const hostname = headersList.get('host') || ''
        const currentSubdomain = extractTenantFromHostname(hostname)

        if (currentSubdomain) {
            const { data: subdomainTenant } = await supabase
                .from('tenants')
                .select('id')
                .eq('slug', currentSubdomain)
                .single()

            return subdomainTenant?.id || null
        }
        return null
    }

    // For regular users, return their tenant_id
    return profile?.tenant_id || null
}