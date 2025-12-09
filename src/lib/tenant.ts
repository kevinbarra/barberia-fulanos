'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Obtiene el slug del tenant desde el header inyectado por el middleware
 * Solo funciona en producción con subdominios
 */
export async function getTenantSlug(): Promise<string | null> {
    const headersList = await headers()
    return headersList.get('x-tenant-slug')
}

/**
 * Obtiene el tenant completo desde la DB usando el slug del subdominio
 * Retorna null si no hay subdominio o el tenant no existe
 */
export async function getTenantBySubdomain() {
    const slug = await getTenantSlug()
    if (!slug) return null

    const supabase = createAdminClient()

    const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, name, slug, logo_url')
        .eq('slug', slug)
        .single()

    if (error || !tenant) {
        console.warn(`Tenant not found for slug: ${slug}`)
        return null
    }

    return tenant
}

/**
 * Obtiene el tenant_id desde subdominio O desde el perfil del usuario
 * Prioridad: subdominio > perfil del usuario
 * Esto permite compatibilidad durante la migración
 */
export async function getTenantIdFromContext(): Promise<string | null> {
    // 1. Intentar obtener desde subdominio
    const tenantFromSubdomain = await getTenantBySubdomain()
    if (tenantFromSubdomain) {
        return tenantFromSubdomain.id
    }

    // 2. Fallback: obtener desde perfil del usuario (comportamiento actual)
    // Esto se importa dinámicamente para evitar dependencia circular
    const { getTenantId } = await import('@/utils/supabase/server')
    return getTenantId()
}
