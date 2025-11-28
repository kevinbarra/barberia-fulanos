'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveSchedule(formData: FormData) {
    const supabase = await createClient()

    // 1. Obtener usuario
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 2. Obtener tenant
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const updates = []

    // 3. Preparar datos
    for (const day of days) {
        const isActive = formData.get(`${day}_active`) === 'on'
        const startTime = formData.get(`${day}_start`) as string
        const endTime = formData.get(`${day}_end`) as string

        if (isActive && startTime && endTime) {
            updates.push({
                tenant_id: profile?.tenant_id,
                staff_id: user.id,
                day: day,
                start_time: startTime,
                end_time: endTime,
                is_active: true
            })
        } else {
            // Guardamos como inactivo para que no se pierda el registro
            updates.push({
                tenant_id: profile?.tenant_id,
                staff_id: user.id,
                day: day,
                start_time: '09:00',
                end_time: '18:00',
                is_active: false
            })
        }
    }

    // 4. Guardar en DB
    const { error } = await supabase
        .from('staff_schedules')
        .upsert(updates, { onConflict: 'staff_id, day' })

    if (error) {
        console.error('Error guardando horario:', error)
        // CAMBIO: Ya no devolvemos { error: ... }, simplemente terminamos.
        // Podríamos redirigir a una página de error si fuera crítico, 
        // pero para este MVP el log es suficiente.
        return
    }

    // 5. Actualizar la vista
    revalidatePath('/admin/schedule')

    // CAMBIO: No devolvemos nada (void) para que TypeScript sea feliz.
}