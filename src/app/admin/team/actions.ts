'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- INVITAR STAFF (BLINDADO 0.1%) ---
export async function inviteStaff(formData: FormData) {
    const supabase = await createClient()

    // 1. Verificar Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const { data: requester } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    if (requester?.role !== 'owner') return { error: 'Solo el dueño puede invitar' }

    const emailRaw = formData.get('email') as string
    if (!emailRaw) return { error: 'Email requerido' }
    const email = emailRaw.toLowerCase().trim()

    // 2. ESTRATEGIA HÍBRIDA
    // Primero, creamos/actualizamos la invitación SIEMPRE.
    // Esto actúa como "fuente de verdad" de que queremos a esta persona.
    const { error: inviteError } = await supabase
        .from('staff_invitations')
        .upsert({
            tenant_id: requester.tenant_id,
            email: email,
            role: 'staff',
            status: 'pending'
        }, { onConflict: 'tenant_id, email' })

    if (inviteError) {
        console.error(inviteError)
        return { error: 'Error al registrar invitación.' }
    }

    // 3. INTENTO DE VINCULACIÓN INMEDIATA (Auto-Claim)
    // Llamamos a la función RPC maestra que creamos antes.
    // Ella buscará si el usuario ya existe en Auth/Profiles y lo conectará ahora mismo.
    // Nota: RPC 'claim_invitation_by_email' es una función nueva que crearemos abajo para el admin
    // Por ahora, usaremos lógica manual segura:

    // Buscar si existe el perfil PUBLICO
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

    if (existingProfile) {
        // Si existe, lo forzamos a ser staff AHORA
        await supabase.from('profiles').update({
            role: 'staff',
            tenant_id: requester.tenant_id
        }).eq('id', existingProfile.id)

        // Y cerramos la invitación
        await supabase.from('staff_invitations').update({ status: 'accepted' }).eq('email', email)

        revalidatePath('/admin/team')
        return { success: true, message: 'Usuario existente añadido al equipo.' }
    }

    revalidatePath('/admin/team')
    return { success: true, message: 'Invitación enviada. Esperando que el usuario se registre.' }
}

// --- ELIMINAR STAFF ---
export async function removeStaff(targetId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { data: requester } = await supabase.from('profiles').select('role').eq('id', user?.id).single()

    if (requester?.role !== 'owner') return { error: 'No autorizado' }

    // Intentar borrar de invitaciones
    const { error: invError } = await supabase.from('staff_invitations').delete().eq('id', targetId)

    // Intentar revocar perfil (si es un ID de usuario)
    // Nota: Si targetId era de invitación, esto no hará nada (y está bien)
    const { error: profError } = await supabase.from('profiles').update({ role: 'customer', tenant_id: null }).eq('id', targetId)

    if (invError && profError) return { error: 'No se pudo eliminar.' }

    revalidatePath('/admin/team')
    return { success: true, message: 'Acceso revocado.' }
}