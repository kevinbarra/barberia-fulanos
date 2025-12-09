import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with admin privileges (service_role).
 * This bypasses RLS and should ONLY be used in server-side code
 * for trusted operations like POS ticket creation.
 * 
 * NEVER expose this client or the service_role key to the browser!
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
            'Please add it to your .env.local file.'
        )
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}
