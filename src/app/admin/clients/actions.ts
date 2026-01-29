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

/**
 * Sanitize phone - remove all non-numeric characters
 */
function sanitizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
}

/**
 * Validate phone is exactly 10 digits
 */
function validatePhone(phone: string): { valid: boolean; error?: string } {
    if (phone.length !== 10) {
        return { valid: false, error: 'El número debe ser de 10 dígitos' };
    }
    return { valid: true };
}

/**
 * Generate synthetic email from phone
 */
function generateSyntheticEmail(phone: string): string {
    return `${phone}@phone.agendabarber.pro`;
}

/**
 * Generate password from last 6 digits of phone
 */
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

    // 4. Check if user already exists with this phone
    const adminClient = createAdminClient();

    const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id, full_name, phone')
        .eq('phone', cleanPhone)
        .single();

    if (existingProfile) {
        // User already exists - return their info without creating new
        return {
            success: true,
            message: 'El cliente ya está registrado.',
            data: {
                userId: existingProfile.id,
                // NO credentials for existing users
                script: `¡Bienvenido de nuevo, ${existingProfile.full_name || 'cliente'}! Ya tienes cuenta con nosotros.`
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

        // Handle specific errors
        if (createError.message.includes('already been registered')) {
            // Edge case: Auth user exists but profile doesn't
            return {
                success: false,
                message: 'Este teléfono ya tiene una cuenta asociada.',
                error: createError.message
            };
        }

        return {
            success: false,
            message: 'Error al crear la cuenta del cliente.',
            error: createError.message
        };
    }

    // 6. Create/update profile with tenant association
    const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
            id: newUser.user.id,
            email: syntheticEmail,
            full_name: trimmedName,
            phone: cleanPhone,
            role: 'customer',
            tenant_id: tenantId,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

    if (profileError) {
        console.error('Error creating profile:', profileError);
        // User was created but profile failed - still return success with warning
    }

    // 7. Return success with credentials
    return {
        success: true,
        message: 'Cliente registrado exitosamente.',
        data: {
            userId: newUser.user.id,
            credentials: {
                user: cleanPhone,
                pass: password
            },
            script: `¡Listo, ${trimmedName}! Te hemos creado una cuenta. Tu usuario es tu teléfono: ${cleanPhone.slice(0, 4)}...${cleanPhone.slice(-2)} y tu contraseña son los últimos 6 dígitos de tu número. Con esto podrás ver tus citas y puntos desde la app.`
        }
    };
}
