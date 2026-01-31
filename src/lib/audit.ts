import { createClient } from '@/utils/supabase/server';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'CANCEL' | 'RESTORE' | 'ARCHIVE' | 'LOGIN' | 'LOGOUT';
type AuditEntity = 'bookings' | 'profiles' | 'services' | 'transactions' | 'settings';

interface LogActivityParams {
    tenantId: string;
    actorId: string;
    action: AuditAction;
    entity: AuditEntity;
    entityId: string;
    metadata?: Record<string, any>;
}

/**
 * Logs a critical system activity to the audit_logs table.
 * This function is fire-and-forget: it catches its own errors to avoid blocking the main flow.
 */
export async function logActivity({
    tenantId,
    actorId,
    action,
    entity,
    entityId,
    metadata = {}
}: LogActivityParams) {
    try {
        const supabase = await createClient();

        // We use standard client because RLS allows INSERT for authenticated users
        // But we need to make sure the actor has permissions in the current session
        // If run from a server action where we have an active session, this works.
        // If run from a background job, we might need admin client (but logs usually come from user actions).

        const { error } = await supabase.from('audit_logs').insert({
            tenant_id: tenantId,
            actor_id: actorId,
            action,
            entity,
            entity_id: entityId,
            metadata
        });

        if (error) {
            console.error('FAILED TO LOG ACTIVITY:', error.message, { action, entity, entityId });
        }
    } catch (err) {
        console.error('EXCEPTION LOGGING ACTIVITY:', err);
    }
}
