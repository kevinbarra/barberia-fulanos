'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateClientProfile(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const fullName = formData.get('full_name') as string
    const phone = formData.get('phone') as string | null
    const file = formData.get('avatar') as File | null

    console.log('[PROFILE] Updating profile for:', user.id)
    console.log('[PROFILE] Received Data:', { fullName, phone, file_size: file?.size })

    let avatarUrl = null

    if (file && file.size > 0) {
        if (file.size > 5 * 1024 * 1024) return { error: 'Imagen muy pesada (Max 5MB)' }
        const fileExt = file.name.split('.').pop()
        const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
        if (uploadError) { console.error('[PROFILE] Upload Error:', uploadError); return { error: 'Error al subir imagen' }; }
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
        avatarUrl = publicUrl
    }

    // CORRECCIÓN: Tipo seguro para satisfacer al Linter
    const updateData: Record<string, string | null> = { full_name: fullName }
    if (phone) updateData.phone = phone
    if (avatarUrl) updateData.avatar_url = avatarUrl

    console.log('[PROFILE] Sending to DB:', updateData)

    const { error, data } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()

    if (error) {
        console.error("[PROFILE] Error DB:", error);
        return { error: 'Error al guardar. Intenta de nuevo.' };
    }

    console.log('[PROFILE] Success:', data)

    revalidatePath('/app', 'layout')
    revalidatePath('/app/profile')

    return { success: true, message: 'Perfil actualizado' }
}