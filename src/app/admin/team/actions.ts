'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendStaffInvitation } from '@/lib/email'

// --- INVITAR STAFF ---
export async function inviteStaff(formData: FormData) {
    const supabase = await createClient()

    // 1. Verificar Autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // 2. Verificar Permisos (Owner o Super Admin)
    const { data: requester } = await supabase
        .from('profiles')
        .select('role, tenant_id, tenants(name)')
        .eq('id', user.id)
        .single()

    const isManager = requester?.role === 'owner' || requester?.role === 'super_admin';
    if (!isManager) return { error: 'Solo el dueño o admin puede enviar invitaciones.' }

    const emailRaw = formData.get('email') as string
    if (!emailRaw) return { error: 'Email requerido' }
    const email = emailRaw.toLowerCase().trim()

    // --- VERIFICAR SI EL USUARIO YA EXISTE EN EL SISTEMA ---
    const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, role, tenant_id')
        .eq('email', email)
        .single()

    if (existingUser) {
        // Caso 1: Ya es parte de TU equipo
        if (existingUser.tenant_id === requester.tenant_id &&
            (existingUser.role === 'staff' || existingUser.role === 'owner')) {
            return { error: 'Este usuario ya es parte activa de tu equipo.' }
        }

        // Caso 2: Es un usuario existente (cliente u otro) - PROMOVER DIRECTAMENTE
        // Usamos adminClient para bypasear RLS (usuarios con tenant_id diferente)
        const adminSupabase = createAdminClient()
        const { error: updateError } = await adminSupabase
            .from('profiles')
            .update({
                role: 'staff',
                tenant_id: requester.tenant_id
            })
            .eq('id', existingUser.id)

        if (updateError) {
            console.error('Error promoting user:', updateError)
            return { error: 'Error al promover usuario a staff.' }
        }

        revalidatePath('/admin/team')
        return { success: true, message: `${email} ha sido agregado como staff exitosamente.` }
    }

    // --- USUARIO NO EXISTE: CREAR INVITACIÓN PENDIENTE ---
    // 3. Registrar Invitación en Base de Datos (Upsert permite re-enviar si está pendiente)
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const businessName = (requester.tenants as any)?.name || "La Barbería";

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

    const isManager = requester?.role === 'owner' || requester?.role === 'super_admin';
    if (!isManager) return { error: 'No autorizado' }

    const { error: invError } = await supabase.from('staff_invitations').delete().eq('id', targetId)
    const { error: profError } = await supabase.from('profiles').update({ role: 'customer', tenant_id: null }).eq('id', targetId)

    if (invError && profError) {
        return { error: 'No se pudo encontrar el usuario o invitación.' }
    }

    revalidatePath('/admin/team')
    return { success: true, message: 'Acceso revocado correctamente.' }
}

// --- CAMBIAR ROL DE USUARIO ---
export async function changeUserRole(targetId: string, newRole: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // Get requester's info
    const { data: requester } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    if (!requester) return { error: 'No autorizado' }

    // Get target user's info
    const { data: targetUser } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', targetId)
        .single()

    if (!targetUser) return { error: 'Usuario no encontrado' }

    // Permission logic:
    // super_admin: can change any role
    // owner: can only change staff/kiosk roles within their tenant
    // staff/kiosk: cannot change roles

    if (requester.role === 'super_admin') {
        // Super admin can set any role
        const validRoles = ['owner', 'staff', 'kiosk', 'customer', 'super_admin']
        if (!validRoles.includes(newRole)) {
            return { error: 'Rol no válido' }
        }
    } else if (requester.role === 'owner') {
        // Owner can only change roles within their tenant
        if (targetUser.tenant_id !== requester.tenant_id) {
            return { error: 'No puedes modificar usuarios de otro negocio' }
        }

        // Owner cannot assign owner or super_admin roles
        if (newRole === 'owner' || newRole === 'super_admin') {
            return { error: 'No tienes permiso para asignar este rol' }
        }

        // Owner cannot demote another owner
        if (targetUser.role === 'owner') {
            return { error: 'No puedes modificar el rol de otro dueño' }
        }

        const validRoles = ['staff', 'kiosk']
        if (!validRoles.includes(newRole)) {
            return { error: 'Rol no válido' }
        }
    } else {
        return { error: 'No tienes permisos para cambiar roles' }
    }

    // Cannot change own role (except super_admin)
    if (targetId === user.id && requester.role !== 'super_admin') {
        return { error: 'No puedes cambiar tu propio rol' }
    }

    // Apply role change
    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetId)

    if (error) {
        console.error('Error changing role:', error)
        return { error: 'Error al cambiar el rol' }
    }

    revalidatePath('/admin/team')
    return { success: true, message: `Rol cambiado a ${newRole} correctamente` }
}