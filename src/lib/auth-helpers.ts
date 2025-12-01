import { createClient } from '@/utils/supabase/server'

export async function checkAndClaimInvitations() {
    const supabase = await createClient()

    // Llamamos a la Función Maestra Segura (RPC)
    // No necesitamos pasar parámetros, la base de datos ya sabe quién eres.
    const { data, error } = await supabase.rpc('claim_invitation')

    if (error) {
        console.error("❌ Error en auto-vinculación:", error)
    } else {
        // @ts-ignore
        if (data?.success) {
            console.log(`✅ Perfil actualizado correctamente vía RPC`)
        }
    }
}