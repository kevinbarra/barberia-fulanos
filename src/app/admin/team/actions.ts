'use server'

import { createClient, getTenantIdForAdmin } from '@/utils/supabase/server'
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
    // Usamos adminClient para bypasear RLS y encontrar usuarios de cualquier tenant
    const adminSupabase = createAdminClient()
    const { data: existingUser } = await adminSupabase
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
    if (!user) return { error: 'No autorizado' }

    const { data: requester } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single()

    const isManager = requester?.role === 'owner' || requester?.role === 'super_admin';
    if (!isManager) return { error: 'No autorizado' }

    // SECURITY: Verify target belongs to same tenant
    const tenantId = requester.role === 'super_admin'
        ? await getTenantIdForAdmin()
        : requester.tenant_id

    if (!tenantId) return { error: 'Tenant no encontrado' }

    // Check if target is in same tenant before removing
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', targetId)
        .single()

    // Only allow removal if target is in same tenant (or doesn't exist - might be invite)
    if (targetProfile && targetProfile.tenant_id !== tenantId) {
        return { error: 'No puedes modificar usuarios de otro negocio' }
    }

    // Delete invitation if exists (for same tenant)
    const { error: invError } = await supabase
        .from('staff_invitations')
        .delete()
        .eq('id', targetId)
        .eq('tenant_id', tenantId) // TENANT ISOLATION

    // Revoke profile access
    const { error: profError } = await supabase
        .from('profiles')
        .update({ role: 'customer', tenant_id: null })
        .eq('id', targetId)
        .eq('tenant_id', tenantId) // TENANT ISOLATION

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

// --- TOGGLE STAFF STATUS FLAGS ---
export async function toggleStaffStatus(
    targetId: string,
    field: 'is_active_barber' | 'is_calendar_visible',
    value: boolean
) {
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

    // Only owners and super_admins can toggle these settings
    const isManager = requester.role === 'owner' || requester.role === 'super_admin'
    if (!isManager) return { error: 'No tienes permisos para modificar esto' }

    // Get target user's info to verify same tenant
    const { data: targetUser } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', targetId)
        .single()

    if (!targetUser) return { error: 'Usuario no encontrado' }

    // Owner can only modify users in their tenant
    if (requester.role === 'owner' && targetUser.tenant_id !== requester.tenant_id) {
        return { error: 'No puedes modificar usuarios de otro negocio' }
    }

    // Apply the update
    const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', targetId)

    if (error) {
        console.error('Error toggling staff status:', error)
        return { error: 'Error al actualizar el estado' }
    }

    // Revalidate relevant paths
    revalidatePath('/admin/team')
    revalidatePath('/admin/pos')
    revalidatePath('/admin/bookings')
    // Booking widget paths are dynamic, but we revalidate what we can

    const fieldLabel = field === 'is_active_barber' ? 'estado de barbero' : 'visibilidad en calendario'
    return { success: true, message: `${fieldLabel} actualizado` }
}