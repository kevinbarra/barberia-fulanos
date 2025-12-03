'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateClientProfile(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const fullName = formData.get('full_name') as string
    const file = formData.get('avatar') as File | null

    let avatarUrl = null

    if (file && file.size > 0) {
        if (file.size > 5 * 1024 * 1024) return { error: 'Imagen muy pesada (Max 5MB)' }
        const fileExt = file.name.split('.').pop()
        const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
        if (uploadError) { console.error(uploadError); return { error: 'Error al subir imagen' }; }
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
        avatarUrl = publicUrl
    }

    // CORRECCIÓN: Tipo seguro para satisfacer al Linter
    const updateData: Record<string, string | null> = { full_name: fullName }
    if (avatarUrl) updateData.avatar_url = avatarUrl

    const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id)

    if (error) { console.error("Error DB:", error); return { error: 'Error al guardar.' }; }

    revalidatePath('/app', 'layout')
    revalidatePath('/app/profile')

    return { success: true, message: 'Perfil actualizado' }
}