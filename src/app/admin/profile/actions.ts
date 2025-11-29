'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()

    // 1. Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const fullName = formData.get('full_name') as string
    const file = formData.get('avatar') as File | null

    let avatarUrl = null

    // 2. Si hay archivo, subirlo a Storage
    if (file && file.size > 0) {
        // Validar tamaño (ej. max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return { error: 'La imagen es muy pesada (Max 2MB)' }
        }

        const fileExt = file.name.split('.').pop()
        const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return { error: 'Error al subir la imagen' }
        }

        // Obtener la URL pública
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        avatarUrl = publicUrl
    }

    // 3. Actualizar datos en la tabla profiles
    const updateData: any = { full_name: fullName }
    if (avatarUrl) updateData.avatar_url = avatarUrl

    const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

    if (updateError) {
        return { error: 'Error al actualizar perfil' }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/profile')

    return { success: true, message: 'Perfil actualizado correctamente' }
}