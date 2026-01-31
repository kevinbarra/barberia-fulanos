'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { getTenantIdFromContext } from '@/lib/tenant'

// ==================== TYPES ====================

interface ManagedClientResponse {
    success: boolean;
    message: string;
    error?: string;
    mode?: 'new' | 'existing' | 'archived_detected';  // For smart restore flow
    data?: {
        userId: string;
        credentials?: {
            user: string;  // Phone number
            pass: string;  // Last 6 digits (only for NEW users)
        };
        script: string;  // Text for staff to read to client
    };
    archivedClient?: {  // When mode = 'archived_detected'
        id: string;
        name: string;
    };
}

// ==================== HELPER FUNCTIONS ====================

function sanitizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
}

function validatePhone(phone: string): { valid: boolean; error?: string } {
    // Regex: Permite 10 dígitos O una cadena que empiece con *
    const isLegacy = phone.startsWith('*');
    const isStandard = /^[0-9]{10}$/.test(phone);

    if (!isLegacy && !isStandard) {
        return { valid: false, error: 'Debe ser 10 dígitos o un cliente migrado (*)' };
    }
    return { valid: true };
}

function generateSyntheticEmail(phone: string): string {
    return `${phone}@phone.agendabarber.pro`;
}

function generatePassword(phone: string): string {
    return phone.slice(-6);
}

// ==================== MAIN ACTION ====================

import { logActivity } from '@/lib/audit'

export async function createManagedClient(
    name: string,
    phone: string,
    email?: string  // Optional contact email (saved to profiles, NOT auth)
): Promise<ManagedClientResponse> {
    // 1. Validate staff/owner access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'No autorizado', error: 'No autorizado' };
    }

    // 2. Get tenant context
    const tenantId = await getTenantIdFromContext();
    if (!tenantId) {
        return { success: false, message: 'No se pudo determinar el negocio', error: 'Tenant not found' };
    }

    // 3. Sanitize and validate phone
    const cleanPhone = sanitizePhone(phone);
    const validation = validatePhone(cleanPhone);

    if (!validation.valid) {
        return { success: false, message: validation.error!, error: validation.error };
    }

    // 4. Check if user already exists with this phone (Smart Check)
    const adminClient = createAdminClient();

    const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id, full_name, phone, deleted_at')
        .eq('phone', cleanPhone)
        .single();

    if (existingProfile) {
        // Check if this is an ARCHIVED client (Smart Restore Flow)
        if (existingProfile.deleted_at) {
            return {
                success: false,
                message: `El número pertenece a "${existingProfile.full_name}" que está archivado.`,
                mode: 'archived_detected',
                archivedClient: {
                    id: existingProfile.id,
                    name: existingProfile.full_name || 'Cliente sin nombre'
                }
            };
        }

        // User already exists and is ACTIVE - Return ID but NO credentials
        return {
            success: true,
            message: 'El cliente ya está registrado.',
            mode: 'existing',
            data: {
                userId: existingProfile.id,
                script: `¡Atención! Este cliente ya tiene cuenta registrada como ${existingProfile.full_name}. No es necesario darle nueva contraseña.`
            }
        };
    }

    // 5. Create shadow user (new client)
    const syntheticEmail = generateSyntheticEmail(cleanPhone);
    const password = generatePassword(cleanPhone);
    const trimmedName = name.trim() || 'Cliente';

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: syntheticEmail,
        password: password,
        email_confirm: true, // Auto-confirm
        user_metadata: {
            full_name: trimmedName,
            phone: cleanPhone,
            is_managed: true
        }
    });

    if (createError) {
        console.error('Error creating managed client:', createError);

        if (createError.message.includes('already been registered')) {
            return {
                success: false,
                message: 'Este teléfono ya tiene una cuenta asociada en el sistema.',
                error: createError.message
            };
        }

        return {
            success: false,
            message: 'Error al crear la cuenta del cliente.',
            error: createError.message
        };
    }

    // 6. Create profile (contact_email is optional, stored separately from auth)
    const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
            id: newUser.user.id,
            email: syntheticEmail,
            full_name: trimmedName,
            phone: cleanPhone,
            role: 'customer',
            tenant_id: tenantId,
            ...(email && { contact_email: email.trim().toLowerCase() })  // Optional contact email
        }, { onConflict: 'id' });

    if (profileError) {
        console.error('Error creating profile:', profileError);
        // Handle duplicate phone constraint violation
        if (profileError.code === '23505') {
            return {
                success: false,
                message: 'Este número de teléfono ya está registrado en esta sucursal.',
                error: 'Duplicate phone'
            };
        }
    }

    // AUDIT LOG
    await logActivity({
        tenantId,
        actorId: user.id,
        action: 'CREATE',
        entity: 'profiles',
        entityId: newUser.user.id,
        metadata: { name: trimmedName, phone: cleanPhone, method: 'staff_managed' }
    });

    // 7. Return success with credentials & script
    return {
        success: true,
        message: 'Cliente registrado exitosamente.',
        data: {
            userId: newUser.user.id,
            credentials: {
                user: cleanPhone,
                pass: password
            },
            // CORRECCIÓN UX: Guion claro y directo
            script: `¡Listo! Dígale al cliente: "Para entrar a la App, su usuario es su celular ${cleanPhone} y su contraseña son los últimos 6 dígitos: ${password}".`
        }
    };
}

// ==================== GET ALL CLIENTS ====================

export interface ClientListItem {
    id: string;
    full_name: string;
    phone: string | null;
    loyalty_points: number;
    created_at: string;
    last_visit?: string | null;
    deleted_at?: string | null;  // For archived clients view
}

export type ClientFilter = 'active' | 'archived';

export async function getAllClients(filter: ClientFilter = 'active'): Promise<ClientListItem[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const tenantId = await getTenantIdFromContext();
    if (!tenantId) return [];

    const adminClient = createAdminClient();

    // Build query based on filter
    let query = adminClient
        .from('profiles')
        .select('id, full_name, phone, loyalty_points, created_at, deleted_at')
        .eq('tenant_id', tenantId)
        .eq('role', 'customer');

    // Apply soft delete filter
    if (filter === 'active') {
        query = query.is('deleted_at', null);
    } else {
        query = query.not('deleted_at', 'is', null);
    }

    const { data: clients, error } = await query
        .order('created_at', { ascending: false })
        .limit(200);

    if (error || !clients) return [];

    // Get last visit for each client (from bookings)
    const clientIds = clients.map(c => c.id);
    const { data: lastVisits } = await adminClient
        .from('bookings')
        .select('customer_id, start_time')
        .in('customer_id', clientIds)
        .eq('status', 'completed')
        .order('start_time', { ascending: false });

    // Map last visits by customer_id (taking the first/most recent one)
    const lastVisitMap = new Map<string, string>();
    if (lastVisits) {
        for (const visit of lastVisits) {
            if (visit.customer_id && !lastVisitMap.has(visit.customer_id)) {
                lastVisitMap.set(visit.customer_id, visit.start_time);
            }
        }
    }

    return clients.map(c => ({
        id: c.id,
        full_name: c.full_name || 'Sin nombre',
        phone: c.phone,
        loyalty_points: c.loyalty_points || 0,
        created_at: c.created_at,
        last_visit: lastVisitMap.get(c.id) || null,
        deleted_at: c.deleted_at || null  // Include for archived view
    }));
}

// ==================== SEARCH CLIENTS ====================

interface ClientSearchResult {
    id: string;
    full_name: string;
    phone: string | null;
}

export async function searchClients(query: string): Promise<ClientSearchResult[]> {
    if (!query || query.length < 2) return [];

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Get tenant context
    const tenantId = await getTenantIdFromContext();
    if (!tenantId) return [];

    const adminClient = createAdminClient();
    const cleanQuery = query.trim().toLowerCase();
    const isPhoneSearch = /^\d+$/.test(cleanQuery);

    let results: ClientSearchResult[] = [];

    if (isPhoneSearch) {
        // Search by phone (partial match) - exclude archived
        const { data } = await adminClient
            .from('profiles')
            .select('id, full_name, phone')
            .eq('tenant_id', tenantId)
            .eq('role', 'customer')
            .is('deleted_at', null)  // Soft delete filter
            .like('phone', `%${cleanQuery}%`)
            .limit(10);

        results = data || [];
    } else {
        // Search by name (partial match, case insensitive) - exclude archived
        const { data } = await adminClient
            .from('profiles')
            .select('id, full_name, phone')
            .eq('tenant_id', tenantId)
            .eq('role', 'customer')
            .is('deleted_at', null)  // Soft delete filter
            .ilike('full_name', `%${cleanQuery}%`)
            .limit(10);

        results = data || [];
    }

    return results;
}

// ==================== ARCHIVE CLIENT (Soft Delete) ====================

interface ArchiveClientResponse {
    success: boolean;
    message: string;
    error?: string;
}

export async function archiveClient(clientId: string): Promise<ArchiveClientResponse> {
    // 1. Validate staff/owner access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'No autorizado', error: 'Unauthorized' };
    }

    // 2. Get tenant context
    const tenantId = await getTenantIdFromContext();
    if (!tenantId) {
        return { success: false, message: 'No se pudo determinar el negocio', error: 'Tenant not found' };
    }

    const adminClient = createAdminClient();

    // 3. Verify client belongs to this tenant and is a customer
    const { data: existingClient, error: fetchError } = await adminClient
        .from('profiles')
        .select('id, full_name, role, tenant_id')
        .eq('id', clientId)
        .single();

    if (fetchError || !existingClient) {
        return { success: false, message: 'Cliente no encontrado', error: 'Client not found' };
    }

    if (existingClient.tenant_id !== tenantId) {
        return { success: false, message: 'No tienes permiso para archivar este cliente', error: 'Forbidden' };
    }

    if (existingClient.role !== 'customer') {
        return { success: false, message: 'Solo se pueden archivar clientes, no staff', error: 'Invalid role' };
    }

    // 4. Perform soft delete (set deleted_at timestamp)
    const { error: updateError } = await adminClient
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', clientId);

    if (updateError) {
        console.error('Error archiving client:', updateError);
        return { success: false, message: 'Error al archivar cliente', error: updateError.message };
    }

    return {
        success: true,
        message: `Cliente "${existingClient.full_name}" archivado exitosamente. Su historial se mantiene intacto.`
    };
}

// ==================== RESTORE CLIENT (Undo Soft Delete) ====================

export async function restoreClient(clientId: string): Promise<ArchiveClientResponse> {
    // 1. Validate staff/owner access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'No autorizado', error: 'Unauthorized' };
    }

    // 2. Get tenant context
    const tenantId = await getTenantIdFromContext();
    if (!tenantId) {
        return { success: false, message: 'No se pudo determinar el negocio', error: 'Tenant not found' };
    }

    const adminClient = createAdminClient();

    // 3. Verify client belongs to this tenant and is archived
    const { data: existingClient, error: fetchError } = await adminClient
        .from('profiles')
        .select('id, full_name, role, tenant_id, deleted_at')
        .eq('id', clientId)
        .single();

    if (fetchError || !existingClient) {
        return { success: false, message: 'Cliente no encontrado', error: 'Client not found' };
    }

    if (existingClient.tenant_id !== tenantId) {
        return { success: false, message: 'No tienes permiso para restaurar este cliente', error: 'Forbidden' };
    }

    if (!existingClient.deleted_at) {
        return { success: false, message: 'Este cliente no está archivado', error: 'Not archived' };
    }

    // 4. Restore client (clear deleted_at)
    const { error: updateError } = await adminClient
        .from('profiles')
        .update({ deleted_at: null })
        .eq('id', clientId);

    if (updateError) {
        console.error('Error restoring client:', updateError);
        return { success: false, message: 'Error al restaurar cliente', error: updateError.message };
    }

    return {
        success: true,
        message: `Cliente "${existingClient.full_name}" restaurado exitosamente.`
    };
}

// ==================== UPDATE MANAGED CLIENT ====================

interface UpdateManagedClientResponse {
    success: boolean;
    message: string;
    error?: string;
    mode?: 'name_only' | 'phone_change';
    data?: {
        newName: string;
        newPhone: string;
        credentials?: {
            user: string;
            pass: string;
        };
        script?: string;
    };
}

export async function updateManagedClient(
    userId: string,
    newName: string,
    newPhone: string
): Promise<UpdateManagedClientResponse> {
    // 1. Validate staff/owner access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'No autorizado', error: 'No autorizado' };
    }

    // 2. Get tenant context
    const tenantId = await getTenantIdFromContext();
    if (!tenantId) {
        return { success: false, message: 'No se pudo determinar el negocio', error: 'Tenant not found' };
    }

    // 3. Sanitize and validate new phone
    const cleanPhone = sanitizePhone(newPhone);
    const validation = validatePhone(cleanPhone);

    if (!validation.valid) {
        return { success: false, message: validation.error!, error: validation.error };
    }

    const trimmedName = newName.trim() || 'Cliente';
    const adminClient = createAdminClient();

    // 4. Get current profile to compare
    const { data: currentProfile, error: profileFetchError } = await adminClient
        .from('profiles')
        .select('phone, full_name, email')
        .eq('id', userId)
        .single();

    if (profileFetchError || !currentProfile) {
        return { success: false, message: 'Cliente no encontrado', error: 'Profile not found' };
    }

    const phoneChanged = currentProfile.phone !== cleanPhone;

    // 5. SCENARIO A: Name only change
    if (!phoneChanged) {
        const { error: updateError } = await adminClient
            .from('profiles')
            .update({ full_name: trimmedName })
            .eq('id', userId);

        if (updateError) {
            return { success: false, message: 'Error al actualizar', error: updateError.message };
        }

        return {
            success: true,
            message: 'Nombre actualizado correctamente.',
            mode: 'name_only',
            data: {
                newName: trimmedName,
                newPhone: cleanPhone
            }
        };
    }

    // 6. SCENARIO B: Phone changed - need to update Auth + Profile
    // Check if new phone is already in use
    const { data: existingWithPhone } = await adminClient
        .from('profiles')
        .select('id')
        .eq('phone', cleanPhone)
        .neq('id', userId)
        .single();

    if (existingWithPhone) {
        return { success: false, message: 'Este teléfono ya está registrado por otro cliente.', error: 'Phone in use' };
    }

    // Generate new credentials
    const newEmail = generateSyntheticEmail(cleanPhone);
    const newPassword = generatePassword(cleanPhone);

    // Update Auth user
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
        email: newEmail,
        password: newPassword,
        user_metadata: {
            full_name: trimmedName,
            phone: cleanPhone,
            is_managed: true
        }
    });

    if (authError) {
        console.error('Error updating auth user:', authError);
        return { success: false, message: 'Error al actualizar credenciales', error: authError.message };
    }

    // Update Profile
    const { error: profileUpdateError } = await adminClient
        .from('profiles')
        .update({
            full_name: trimmedName,
            phone: cleanPhone,
            email: newEmail
        })
        .eq('id', userId);

    if (profileUpdateError) {
        console.error('Error updating profile:', profileUpdateError);
        // Auth was updated but profile failed - still return partial success
    }

    return {
        success: true,
        message: 'Cliente actualizado con nuevas credenciales.',
        mode: 'phone_change',
        data: {
            newName: trimmedName,
            newPhone: cleanPhone,
            credentials: {
                user: cleanPhone,
                pass: newPassword
            },
            script: `📱 IMPORTANTE: El teléfono cambió. Dígale al cliente: "Su NUEVO usuario es ${cleanPhone} y su NUEVA contraseña son los últimos 6 dígitos: ${newPassword}".`
        }
    };
}
