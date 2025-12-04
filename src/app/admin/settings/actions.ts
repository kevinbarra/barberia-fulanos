'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateTenant(formData: FormData) {
    const supabase = await createClient()

    // 1. Auth & Permisos
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'owner') return { error: 'Solo el dueño puede configurar el negocio.' }

    const name = formData.get('name') as string
    const slug = formData.get('slug') as string
    const file = formData.get('logo') as File | null

    let logoUrl = null

    // 2. Subida de Logo
    if (file && file.size > 0) {
        if (file.size > 2 * 1024 * 1024) return { error: 'El logo debe pesar menos de 2MB.' }

        const fileExt = file.name.split('.').pop()
        const filePath = `${profile.tenant_id}/logo-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(filePath, file, { upsert: true })

        if (uploadError) return { error: 'Error al subir logo.' }

        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath)
        logoUrl = publicUrl
    }

    // 3. Actualizar Tenant
    const updateData: Record<string, string> = { name, slug }
    if (logoUrl) updateData.logo_url = logoUrl

    const { error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', profile.tenant_id)

    if (error) {
        if (error.code === '23505') return { error: 'Ese enlace (slug) ya está ocupado.' }
        return { error: 'Error al guardar configuración.' }
    }

    revalidatePath('/admin')
    revalidatePath('/book/[slug]', 'layout') // Actualiza la página pública

    return { success: true, message: 'Negocio actualizado.' }
}