'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- CREAR SERVICIO ---
export async function createService(formData: FormData) {
    const supabase = await createClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const name = formData.get('name') as string
    const price = formData.get('price') as string
    const duration = formData.get('duration') as string
    const category = formData.get('category') as string || 'General' // <--- NUEVO
    const tenant_id = formData.get('tenant_id') as string

    const { error } = await supabase.from('services').insert({
        name,
        price: parseFloat(price),
        duration_min: parseInt(duration),
        category,
        tenant_id: tenant_id,
        is_active: true
    })

    if (error) return { error: 'Error al crear servicio' }

    revalidatePath('/admin/services')
    return { success: true, message: 'Servicio creado' }
}

// --- ACTUALIZAR SERVICIO ---
export async function updateService(formData: FormData) {
    const supabase = await createClient()
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const price = formData.get('price') as string
    const duration = formData.get('duration') as string
    const category = formData.get('category') as string // <--- NUEVO

    const { error } = await supabase
        .from('services')
        .update({
            name,
            price: parseFloat(price),
            duration_min: parseInt(duration),
            category
        })
        .eq('id', id)

    if (error) return { error: 'Error al actualizar' }

    revalidatePath('/admin/services')
    return { success: true, message: 'Servicio actualizado' }
}

// --- CAMBIAR ESTADO (ACTIVAR/DESACTIVAR) ---
export async function toggleServiceStatus(id: string, currentStatus: boolean) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('services')
        .update({ is_active: !currentStatus })
        .eq('id', id)

    if (error) return { error: 'Error al cambiar estado' }

    revalidatePath('/admin/services')
    return { success: true, message: currentStatus ? 'Servicio desactivado' : 'Servicio activado' }
}

// --- ELIMINAR SERVICIO (CON SEGURIDAD) ---
export async function deleteService(id: string) {
    const supabase = await createClient()

    // 1. Verificar si tiene uso histórico (Citas o Transacciones)
    const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', id)

    const { count: transactionsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', id)

    // Si tiene historial, bloqueamos el borrado
    if ((bookingsCount || 0) > 0 || (transactionsCount || 0) > 0) {
        return {
            success: false,
            error: 'No se puede eliminar: Este servicio tiene ventas o citas registradas. Mejor desactívalo.'
        }
    }

    // 2. Si está limpio, procedemos a borrar
    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)

    if (error) return { success: false, error: 'Error al eliminar servicio' }

    revalidatePath('/admin/services')
    return { success: true, message: 'Servicio eliminado correctamente' }
}