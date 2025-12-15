import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SelectAccountClient from './SelectAccountClient'
import { buildSubdomainUrl } from '@/lib/constants'

/**
 * SELECT ACCOUNT PAGE (SERVER COMPONENT)
 * 
 * Fetches user's tenant memberships and renders the selection UI.
 * Only shown to users with 2+ tenant memberships.
 */
export default async function SelectAccountPage() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    // Get user's tenant memberships
    const { data: memberships, error: membershipError } = await supabase
        .from('tenant_members')
        .select(`
            tenant_id,
            role,
            tenants(id, slug, name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)

    if (membershipError) {
        console.error('[SelectAccount] Error fetching memberships:', membershipError)
        redirect('/login?error=membership-error')
    }

    // If no memberships, redirect to onboarding
    if (!memberships || memberships.length === 0) {
        redirect('/onboarding')
    }

    // If only one membership, redirect directly
    if (memberships.length === 1) {
        const tenant = memberships[0].tenants as unknown as { slug: string } | null
        if (tenant?.slug) {
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                redirect('/admin')
            }
            redirect(buildSubdomainUrl(tenant.slug, '/admin'))
        }
    }

    // Format data for client component
    const accounts = memberships.map(m => {
        const tenant = m.tenants as unknown as { id: string; slug: string; name: string } | null
        return {
            tenantId: tenant?.id || '',
            slug: tenant?.slug || '',
            name: tenant?.name || 'Sin nombre',
            role: m.role as 'owner' | 'staff'
        }
    }).filter(a => a.slug) // Filter out any without slugs

    return <SelectAccountClient accounts={accounts} />
}
