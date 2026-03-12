'use server'

import { createClient, getTenantIdForAdmin } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/audit'

async function validateAdminAccess() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado', supabase: null, tenantId: null }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile || !['owner', 'super_admin'].includes(profile.role)) {
        return { error: 'Permisos insuficientes para importar masivamente', supabase: null, tenantId: null }
    }

    const tenantId = profile.role === 'super_admin'
        ? await getTenantIdForAdmin()
        : profile.tenant_id

    if (!tenantId) {
        return { error: 'Tenant no encontrado', supabase: null, tenantId: null }
    }

    return { error: null, supabase, tenantId, role: profile.role, userId: user.id }
}

export async function matchAndCreateCategories(categoryNames: string[]) {
    const { error, supabase, tenantId } = await validateAdminAccess()
    if (error || !supabase) return { error }

    // Deduplicate and filter empty
    const uniqueNames = Array.from(new Set(categoryNames.map(c => c?.trim()).filter(Boolean)))
    if (uniqueNames.length === 0) return { categoryMap: {} }

    // 1. Fetch existing categories for this tenant
    const { data: existingCategories, error: fetchError } = await supabase
        .from('service_categories')
        .select('id, name')
        .eq('tenant_id', tenantId)

    if (fetchError) return { error: 'Error al consultar categorías existentes' }

    const categoryMap: Record<string, string> = {}
    const existingMap = new Map((existingCategories || []).map(c => [c.name.toLowerCase(), c.id]))

    const categoriesToCreate: { name: string, tenant_id: string }[] = []

    // 2. Map existing or prepare to create new
    uniqueNames.forEach(name => {
        const lowerName = name.toLowerCase()
        if (existingMap.has(lowerName)) {
            categoryMap[name] = existingMap.get(lowerName)!
        } else {
            categoriesToCreate.push({ name, tenant_id: tenantId as string })
        }
    })

    // 3. Create missing categories
    if (categoriesToCreate.length > 0) {
        const { data: newCategories, error: insertError } = await supabase
            .from('service_categories')
            .insert(categoriesToCreate)
            .select('id, name')

        if (insertError) {
            console.error('Error creating categories:', insertError)
            return { error: 'Error al crear nuevas categorías' }
        }

        if (newCategories) {
            newCategories.forEach(c => {
                // Find original casing from request to map back correctly
                const originalName = uniqueNames.find(un => un.toLowerCase() === c.name.toLowerCase()) || c.name
                categoryMap[originalName] = c.id
            })
        }
    }

    return { categoryMap }
}

export type DraftService = {
    name: string;
    price: number | null;
    category: string;
    description: string;
    duration_min: number;
    slug: string;
    category_id?: string | null;
    status?: 'red' | 'yellow' | 'blue' | 'green';
    metadata?: any;
}

export async function bulkCreateServices(services: DraftService[]) {
    const { error, supabase, tenantId, userId } = await validateAdminAccess()
    if (error || !supabase) return { error }

    if (!services || services.length === 0) {
        return { error: 'No hay servicios para importar' }
    }

    const payload = services.map(s => ({
        tenant_id: tenantId,
        name: s.name,
        price: Number(s.price) || 0,
        description: s.description || null,
        duration_min: Number(s.duration_min) || 30,
        slug: s.slug || null,
        category_id: s.category_id || null,
        is_active: true,
        metadata: s.metadata || {}
    }))

    const { error: insertError } = await supabase
        .from('services')
        .insert(payload)

    if (insertError) {
        console.error('Error en bulk insert:', insertError)
        return { error: 'Hubo un error al guardar los servicios en la base de datos: ' + insertError.message }
    }

    if (userId) {
        await logActivity({
            tenantId: tenantId as string,
            actorId: userId,
            action: 'CREATE',
            entity: 'services',
            entityId: 'bulk_import',
            metadata: { count: payload.length, action: 'JSON Bulk Import' }
        })
    }

    revalidatePath('/admin/services')
    revalidatePath('/admin/pos')
    revalidatePath('/admin/bookings')

    return { success: true }
}
