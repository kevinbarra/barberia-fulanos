'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendStaffInvitation } from '@/lib/email'

// --- INVITAR STAFF ---
export async function inviteStaff(formData: FormData) {
    const supabase = await createClient()

    // 1. Verificar Autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // 2. Verificar Permisos (Solo Owner invita)
    const { data: requester } = await supabase
        .from('profiles')
        .select('role, tenant_id, tenants(name)')
        .eq('id', user.id)
        .single()

    if (requester?.role !== 'owner') return { error: 'Solo el dueño puede enviar invitaciones.' }

    const emailRaw = formData.get('email') as string
    if (!emailRaw) return { error: 'Email requerido' }
    const email = emailRaw.toLowerCase().trim()

    // 3. Registrar Invitación en Base de Datos
    const { error: inviteError } = await supabase
        .from('staff_invitations')
        .upsert({
            tenant_id: requester.tenant_id,
            email: email,
            role: 'staff',
            status: 'pending'
        }, { onConflict: 'tenant_id, email' })

    if (inviteError) {
        console.error('DB Invite Error:', inviteError)
        return { error: 'Error al registrar la invitación en el sistema.' }
    }

    // 4. Preparar Datos del Correo
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/login?email=${encodeURIComponent(email)}`;

    // @ts-ignore - Supabase types a veces infieren mal los joins
    const businessName = requester.tenants?.name || "La Barbería";

    // 5. Enviar el Correo Real
    const emailResult = await sendStaffInvitation({
        email,
        businessName,
        inviteLink
    });

    revalidatePath('/admin/team')

    // 6. Retornar Resultado
    if (emailResult.success) {
        return { success: true, message: `Invitación enviada a ${email}` }
    } else {
        return { success: true, message: 'Usuario registrado, pero falló el envío del correo.' }
    }
}

// --- ELIMINAR STAFF ---
export async function removeStaff(targetId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { data: requester } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    if (requester?.role !== 'owner') return { error: 'No autorizado' }

    // Eliminar invitación o degradar usuario
    const { error: invError } = await supabase.from('staff_invitations').delete().eq('id', targetId)
    const { error: profError } = await supabase.from('profiles').update({ role: 'customer', tenant_id: null }).eq('id', targetId)

    if (invError && profError) {
        return { error: 'No se pudo encontrar el usuario o invitación.' }
    }

    revalidatePath('/admin/team')
    return { success: true, message: 'Acceso revocado correctamente.' }
}