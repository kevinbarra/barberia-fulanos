'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { getTenantIdFromContext } from '@/lib/tenant'

// ==================== TYPES ====================

interface ManagedClientResponse {
    success: boolean;
    message: string;
    error?: string;
    data?: {
        userId: string;
        credentials?: {
            user: string;  // Phone number
            pass: string;  // Last 6 digits (only for NEW users)
        };
        script: string;  // Text for staff to read to client
    };
}

// ==================== HELPER FUNCTIONS ====================

function sanitizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
}

function validatePhone(phone: string): { valid: boolean; error?: string } {
    if (phone.length !== 10) {
        return { valid: false, error: 'El número debe ser de 10 dígitos' };
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

export async function createManagedClient(
    name: string,
    phone: string
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
        .select('id, full_name, phone')
        .eq('phone', cleanPhone)
        .single();

    if (existingProfile) {
        // User already exists - Return ID but NO credentials
        return {
            success: true,
            message: 'El cliente ya está registrado.',
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

    // 6. Create profile
    // CORRECCIÓN: Eliminado "updated_at" para evitar error de base de datos
    const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
            id: newUser.user.id,
            email: syntheticEmail,
            full_name: trimmedName,
            phone: cleanPhone,
            role: 'customer',
            tenant_id: tenantId
        }, { onConflict: 'id' });

    if (profileError) {
        console.error('Error creating profile:', profileError);
    }

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
        // Search by phone (partial match)
        const { data } = await adminClient
            .from('profiles')
            .select('id, full_name, phone')
            .eq('tenant_id', tenantId)
            .eq('role', 'customer')
            .like('phone', `%${cleanQuery}%`)
            .limit(10);

        results = data || [];
    } else {
        // Search by name (partial match, case insensitive)
        const { data } = await adminClient
            .from('profiles')
            .select('id, full_name, phone')
            .eq('tenant_id', tenantId)
            .eq('role', 'customer')
            .ilike('full_name', `%${cleanQuery}%`)
            .limit(10);

        results = data || [];
    }

    return results;
}

