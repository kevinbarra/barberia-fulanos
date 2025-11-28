'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createService(formData: FormData) {
    const supabase = await createClient()

    // 1. DIAGNÓSTICO: ¿Quién está intentando guardar?
    const { data: { user } } = await supabase.auth.getUser()
    console.log("------------------------------------------------")
    console.log("🕵️‍♂️ DEBUG PROCESO DE GUARDADO")
    console.log("🆔 Usuario ID:", user?.id)

    // 2. Obtener datos del formulario
    const name = formData.get('name') as string
    const price = formData.get('price') as string
    const duration = formData.get('duration') as string
    const tenant_id = formData.get('tenant_id') as string

    // 3. DIAGNÓSTICO: ¿Qué datos llegaron?
    console.log("📦 Datos recibidos del formulario:", {
        name,
        price,
        duration,
        tenant_id
    })

    // 4. Intentar insertar en Supabase
    const { error } = await supabase.from('services').insert({
        name,
        price: parseFloat(price),
        duration_min: parseInt(duration),
        tenant_id: tenant_id,
    })

    // 5. DIAGNÓSTICO: Resultado
    if (error) {
        console.error('❌ ERROR FATAL AL INSERTAR EN DB:', error)
        console.log("------------------------------------------------")
        // Redirigimos con el error para que la UI lo sepa
        redirect('/admin/services?error=true')
    }

    console.log("✅ Servicio guardado con éxito")
    console.log("------------------------------------------------")

    // 6. Éxito
    revalidatePath('/admin/services')
    redirect('/admin/services')
}