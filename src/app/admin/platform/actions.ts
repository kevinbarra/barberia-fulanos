'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTenant(formData: FormData) {
    const supabase = await createClient();

    // 1. Validar Super Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'super_admin') {
        return { error: 'Permisos insuficientes. Solo Super Admin.' };
    }

    // 2. Obtener datos
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const ownerEmail = formData.get('owner_email') as string;

    if (!name || !slug || !ownerEmail) {
        return { error: 'Todos los campos son requeridos.' };
    }

    // 3. Crear Tenant
    const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
            name,
            slug: slug.toLowerCase().trim().replace(/\s+/g, '-'),
            subscription_status: 'active' // Default active for now
        })
        .select()
        .single();

    if (tenantError) {
        if (tenantError.code === '23505') return { error: 'El slug ya existe.' };
        return { error: 'Error al crear el negocio (Tenant).' };
    }

    // 4. Provisionar Owner (Si existe el usuario, actualizar perfil. Si no, invitar).
    // NOTA: Por seguridad, no podemos "crear" usuarios de Auth directamente sin enviar correo de confirmación de Supabase.
    // Estrategia:
    // A) Buscar si el profile con ese email ya existe.
    //    SI -> Actualizar su tenant_id y role = 'owner'.
    //    NO -> Crear una invitación pendiente en 'staff_invitations' (o similar) para que cuando se registre, se le asigne.
    //    PARA MVP RAPIDO: Asumiremos que el usuario ya se registró o lo hará. 
    //    Lo mejor es crear una invitación en una tabla 'app_invitations' que un trigger procese al registrarse,
    //    PERO como "Super Admin" tienes poder.

    // Vamos a buscar el usuario por email en la tabla profiles (que es pública/accesible).
    // OJO: Profiles suele tener el ID del user.

    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', ownerEmail)
        .single();

    if (existingProfile) {
        // El usuario ya existe, lo promovemos a Dueño de este nuevo negocio
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                tenant_id: newTenant.id,
                role: 'owner'
            })
            .eq('id', existingProfile.id);

        if (updateError) {
            // Rollback tenant? O avisar?
            return { success: true, message: `Negocio creado, pero error al asignar dueño: ${updateError.message}` };
        }
    } else {
        // El usuario NO existe. 
        // Opción A: Usar la función de admin de supabase (service_role) para invitar user por email.
        // Opción B: Guardar "Pre-registro".
        // Para simplificar este Sprint, retornaremos un aviso.
        return {
            success: true,
            message: 'Negocio creado. El usuario no está registrado aún. Deberá registrarse con ese email para ser vinculado (Requiere Trigger o Asignación manual posterior).'
            // TODO Refinement: En el siguiente paso podríamos hacer un sistema de invitaciones más robusto.
        };
    }

    revalidatePath('/admin/platform');
    return { success: true, message: 'Negocio y Dueño configurados exitosamente.' };
}
