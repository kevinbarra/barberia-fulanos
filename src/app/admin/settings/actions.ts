'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { tenantSchema } from '@/lib/schemas'

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

    // 2. Validación Zod
    const rawData = {
        name: formData.get('name'),
        slug: formData.get('slug'),
    }

    const validatedFields = tenantSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return { error: validatedFields.error.flatten().fieldErrors.name?.[0] || validatedFields.error.flatten().fieldErrors.slug?.[0] || 'Datos inválidos.' }
    }

    const { name, slug } = validatedFields.data;
    const file = formData.get('logo') as File | null;

    let logoUrl = null

    // 3. Subida de Logo
    if (file && file.size > 0) {
        // Validación de Tipo MIME
        if (!file.type.startsWith('image/')) {
            return { error: 'El archivo debe ser una imagen.' };
        }
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

    // 4. Actualizar Tenant
    const updateData: Record<string, string> = { name, slug }
    if (logoUrl) updateData.logo_url = logoUrl

    const { error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', profile.tenant_id)

    if (error) {
        if (error.code === '23505') return { error: 'Ese enlace (slug) ya está ocupado. Intenta con otro.' }
        return { error: 'Error al guardar configuración.' }
    }

    revalidatePath('/admin')
    revalidatePath('/book/[slug]', 'layout')

    return { success: true, message: 'Negocio actualizado correctamente.' }
}