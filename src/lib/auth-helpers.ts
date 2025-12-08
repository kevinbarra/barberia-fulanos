import { createClient } from '@/utils/supabase/server'

export async function checkAndClaimInvitations() {
    const supabase = await createClient()

    const { data } = await supabase.rpc('claim_invitation')

    // Silently handle - no console output needed in production
    return data;
}