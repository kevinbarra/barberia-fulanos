'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

const ROOT_DOMAIN = 'agendabarber.pro'

export async function sendOtp(email: string) {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: true,
        },
    })

    if (error) {
        console.error('Error enviando OTP:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

export async function verifyOtp(email: string, token: string) {
    const supabase = await createClient()

    const { error, data } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
    })

    if (error) {
        console.error('Error verificando OTP:', error)
        return { success: false, error: 'Código inválido o expirado', redirectUrl: null }
    }

    // Obtener tenant del usuario para determinar redirect URL
    let redirectUrl = '/admin' // Default

    if (data.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id, tenants(slug)')
            .eq('id', data.user.id)
            .single()

        // Extraer tenant slug
        let tenantSlug: string | null = null
        if (profile?.tenants) {
            const tenantData = profile.tenants as unknown
            if (typeof tenantData === 'object' && tenantData !== null && 'slug' in tenantData) {
                tenantSlug = (tenantData as { slug: string }).slug
            }
        }

        const userRole = profile?.role?.trim() // Trim any whitespace
        const isSuperAdmin = userRole === 'super_admin'
        const isAdminOrStaff = userRole === 'owner' || userRole === 'staff' || isSuperAdmin

        // Determinar si estamos en producción
        const headersList = await headers()
        const hostname = headersList.get('host') || ''
        const isProduction = hostname.includes(ROOT_DOMAIN) || hostname.includes('vercel.app')

        console.log('[verifyOtp] DEBUG:', {
            userRole,
            isSuperAdmin,
            isProduction,
            tenantSlug,
            hostname,
            roleExact: JSON.stringify(userRole)
        })

        // Super Admin siempre va a www para acceder al platform panel
        // Esta condición tiene prioridad sobre cualquier tenant
        if (isSuperAdmin && isProduction) {
            redirectUrl = `https://www.${ROOT_DOMAIN}/admin/platform`
            console.log('[verifyOtp] Super admin detected, redirecting to platform')
        } else if (isProduction && tenantSlug && isAdminOrStaff) {
            redirectUrl = `https://${tenantSlug}.${ROOT_DOMAIN}/admin`
        } else if (isAdminOrStaff) {
            redirectUrl = '/admin'
        } else {
            redirectUrl = '/app'
        }
    }

    console.log('[verifyOtp] Final redirectUrl:', redirectUrl)
    return { success: true, redirectUrl }
}