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
            .select('role, tenant_id, tenants(slug, subscription_status)')
            .eq('id', data.user.id)
            .single()

        // Extraer tenant data
        let tenantSlug: string | null = null
        let tenantStatus: string = 'active'
        if (profile?.tenants) {
            const tenantData = profile.tenants as unknown
            if (typeof tenantData === 'object' && tenantData !== null) {
                if ('slug' in tenantData) {
                    tenantSlug = (tenantData as { slug: string }).slug
                }
                if ('subscription_status' in tenantData) {
                    tenantStatus = (tenantData as { subscription_status: string }).subscription_status || 'active'
                }
            }
        }

        const userRole = profile?.role?.trim()
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
            tenantStatus,
            hostname
        })

        // Super Admin siempre va a www para acceder al platform panel
        if (isSuperAdmin && isProduction) {
            redirectUrl = `https://www.${ROOT_DOMAIN}/admin/platform`
            console.log('[verifyOtp] Super admin detected, redirecting to platform')
        }
        // Si tenant está suspendido, NO hacer cross-subdomain redirect
        // Quedarse en mismo dominio para que admin layout muestre pantalla de suspensión
        else if (tenantStatus !== 'active') {
            redirectUrl = '/admin'
            console.log('[verifyOtp] Tenant suspended, staying on current domain')
        }
        // Tenant activo, hacer redirect normal
        else if (isProduction && tenantSlug && isAdminOrStaff) {
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