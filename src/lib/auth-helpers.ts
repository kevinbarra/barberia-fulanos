import { createClient } from '@/utils/supabase/server'

export async function checkAndClaimInvitations() {
    const supabase = await createClient()

    // CORRECCIÓN: Eliminada la directiva @ts-expect-error porque el código ya tipa correctamente
    const { data, error } = await supabase.rpc('claim_invitation')

    if (error) {
        console.error("❌ Error en auto-vinculación:", error)
    } else {
        // @ts-ignore - Mantenemos este solo por seguridad si data viene como unknown
        if (data?.success) {
            console.log(`✅ Perfil actualizado correctamente vía RPC`)
        }
    }
}