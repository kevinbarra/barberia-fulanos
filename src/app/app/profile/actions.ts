'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Interface para sanitización de datos - solo campos permitidos por RLS
interface ProfileUpdateData {
    full_name?: string
    phone?: string | null
    avatar_url?: string | null
}

/**
 * updateClientProfile - Sanitized Profile Update with Shadow Profile Claiming
 * 
 * IMPORTANTE: Solo enviamos campos permitidos por la política RLS "Safe Self Edit"
 * NUNCA incluir: id, role, tenant_id, loyalty_points, is_platform_admin
 * 
 * SHADOW PROFILE CLAIMING:
 * Si el teléfono ya existe (error 23505), intenta fusionar con el perfil existente
 * mediante la RPC claim_shadow_profile.
 */
export async function updateClientProfile(formData: FormData) {
    const supabase = await createClient()

    try {
        // 1. Obtener usuario autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.error('[PROFILE] Auth error:', authError)
            return { success: false, error: 'No autorizado' }
        }

        // 2. Extraer datos del form
        const fullName = formData.get('full_name') as string
        const phone = formData.get('phone') as string | null
        const file = formData.get('avatar') as File | null

        console.log('[PROFILE] Updating for:', user.id)
        console.log('[PROFILE] Input:', { fullName, phone, hasFile: !!file?.size })

        // 3. Manejar upload de avatar si existe
        let avatarUrl: string | null = null

        if (file && file.size > 0) {
            if (file.size > 5 * 1024 * 1024) {
                return { success: false, error: 'Imagen muy pesada (Max 5MB)' }
            }

            const fileExt = file.name.split('.').pop()
            const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) {
                console.error('[PROFILE] Upload error:', uploadError)
                return { success: false, error: 'Error al subir imagen' }
            }

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
            avatarUrl = publicUrl
        }

        // 4. SANITIZACIÓN: Construir payload SOLO con campos permitidos
        // Este es el whitelist approach - evita bloqueos RLS
        const updates: ProfileUpdateData = {
            full_name: fullName?.trim() || undefined,
        }

        // Solo agregar phone si tiene valor
        const cleanPhone = phone?.trim() || null
        if (cleanPhone) {
            updates.phone = cleanPhone
        }

        // Solo agregar avatar si se subió uno nuevo
        if (avatarUrl) {
            updates.avatar_url = avatarUrl
        }

        console.log('[PROFILE] Sanitized payload:', updates)

        // 5. Ejecutar update
        const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)

        if (updateError) {
            console.error('[PROFILE] DB Error:', updateError)

            // 5a. SHADOW PROFILE CLAIMING: Si es duplicado de teléfono, intentar fusión
            if (updateError.code === '23505' && cleanPhone) {
                console.log('[PROFILE] Duplicate phone detected, attempting shadow profile claim...')

                const { data: claimResult, error: claimError } = await supabase
                    .rpc('claim_shadow_profile', {
                        target_phone: cleanPhone,
                        new_user_id: user.id
                    })

                if (claimError) {
                    console.error('[PROFILE] Claim RPC error:', claimError)
                    return {
                        success: false,
                        error: 'Este número ya está registrado por otra persona.'
                    }
                }

                if (claimResult?.success) {
                    console.log('[PROFILE] Shadow profile claimed successfully!')
                    revalidatePath('/app/profile')
                    revalidatePath('/app')
                    return {
                        success: true,
                        message: '¡Historial recuperado! Hemos vinculado tus citas anteriores.',
                        claimed: true
                    }
                } else {
                    console.log('[PROFILE] Claim failed:', claimResult?.message)
                    return {
                        success: false,
                        error: claimResult?.message || 'Este número ya está registrado por otra persona.'
                    }
                }
            }

            throw new Error(updateError.message)
        }

        // 6. Revalidar rutas
        revalidatePath('/app/profile')
        revalidatePath('/app')

        console.log('[PROFILE] Success!')
        return { success: true, message: 'Perfil actualizado correctamente' }

    } catch (error) {
        console.error('[PROFILE_UPDATE_ERROR]', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar perfil'
        }
    }
}