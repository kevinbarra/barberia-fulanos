import { createClient } from '@/utils/supabase/server'

export async function checkAndClaimInvitations() {
    const supabase = await createClient()

    // FIX: Eliminado comentario, acceso seguro.
    const { data, error } = await supabase.rpc('claim_invitation')

    if (error) {
        console.error("❌ Error en auto-vinculación:", error)
    } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((data as any)?.success) {
            console.log(`✅ Perfil actualizado correctamente vía RPC`)
        }
    }
}