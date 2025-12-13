'use server'

import { createClient, getTenantIdForAdmin } from '@/utils/supabase/server'
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

    // Allow owner or super_admin
    if (profile?.role !== 'owner' && profile?.role !== 'super_admin') return { error: 'Solo el dueño puede configurar el negocio.' }

    // Get tenant from subdomain for super admin
    const tenantId = await getTenantIdForAdmin();
    if (!tenantId) return { error: 'Error de configuración de cuenta.' }

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
        const filePath = `${tenantId}/logo-${Date.now()}.${fileExt}`

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
        .eq('id', tenantId)

    if (error) {
        if (error.code === '23505') return { error: 'Ese enlace (slug) ya está ocupado. Intenta con otro.' }
        return { error: 'Error al guardar configuración.' }
    }

    revalidatePath('/admin')
    revalidatePath('/book/[slug]', 'layout')

    return { success: true, message: 'Negocio actualizado correctamente.' }
}

// ==================== KIOSK PIN ACTIONS ====================

export async function saveKioskPin(pin: string) {
    const supabase = await createClient()

    // Auth & Permissions - only owner can set PIN
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'owner' && profile?.role !== 'super_admin') return { error: 'Solo el dueño puede configurar el PIN.' }

    if (!/^\d{4}$/.test(pin)) return { error: 'El PIN debe ser de 4 dígitos.' }

    // Save PIN to tenant (stored as plain text - can hash later if needed)
    const { error } = await supabase
        .from('tenants')
        .update({ kiosk_pin: pin })
        .eq('id', profile.tenant_id)

    if (error) {
        console.error('Error saving PIN:', error)
        return { error: 'Error al guardar el PIN.' }
    }

    revalidatePath('/admin/settings')
    return { success: true, message: 'PIN de kiosko guardado correctamente.' }
}

export async function verifyKioskPin(pin: string, tenantIdOverride?: string) {
    const supabase = await createClient()

    // Get tenantId from parameter or from session
    let tenantId = tenantIdOverride

    if (!tenantId) {
        // Get tenant from user session
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { valid: false, error: 'No autorizado' }
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        tenantId = profile?.tenant_id
    }

    if (!tenantId) {
        console.error('No tenant ID found for PIN verification')
        return { valid: false, error: 'No se encontró el tenant.' }
    }

    // Get tenant's PIN
    const { data: tenant, error } = await supabase
        .from('tenants')
        .select('kiosk_pin')
        .eq('id', tenantId)
        .single()

    if (error || !tenant) {
        console.error('Error verifying PIN:', error)
        return { valid: false, error: 'Error al verificar el PIN.' }
    }

    if (!tenant.kiosk_pin) {
        // No PIN set - allow access (for backwards compatibility)
        return { valid: true, noPinSet: true }
    }

    // String comparison (both should be strings)
    const isValid = String(tenant.kiosk_pin).trim() === String(pin).trim()
    console.log('[verifyKioskPin] Comparing:', { stored: tenant.kiosk_pin, input: pin, isValid })

    return { valid: isValid }
}

export async function getKioskPin() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'owner') return { error: 'No autorizado' }

    const { data: tenant } = await supabase
        .from('tenants')
        .select('kiosk_pin')
        .eq('id', profile.tenant_id)
        .single()

    return { pin: tenant?.kiosk_pin || null }
}

// ==================== KIOSK MODE COOKIE ACTIONS ====================
import { cookies } from 'next/headers'

const KIOSK_COOKIE_NAME = 'agendabarber_kiosk_mode'
const KIOSK_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function setKioskModeCookie(tenantId: string) {
    const supabase = await createClient()

    // Verify user is owner or super_admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'owner' && profile?.role !== 'super_admin') {
        return { error: 'Solo el dueño puede activar el modo kiosko' }
    }

    // Set the cookie
    const cookieStore = await cookies()
    cookieStore.set(KIOSK_COOKIE_NAME, tenantId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: KIOSK_COOKIE_MAX_AGE,
        path: '/admin'
    })

    return { success: true }
}

export async function clearKioskModeCookie(pin: string, tenantId: string) {
    // First verify the PIN
    const result = await verifyKioskPin(pin, tenantId)

    if (!result.valid) {
        return { error: 'PIN incorrecto', success: false }
    }

    // Clear the cookie
    const cookieStore = await cookies()
    cookieStore.delete(KIOSK_COOKIE_NAME)

    return { success: true }
}

export async function getKioskModeStatus() {
    const cookieStore = await cookies()
    const kioskCookie = cookieStore.get(KIOSK_COOKIE_NAME)

    return {
        isKioskMode: !!kioskCookie?.value,
        tenantId: kioskCookie?.value || null
    }
}