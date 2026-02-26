'use server'

import { createClient } from '@/utils/supabase/server';

export async function getMyLoyaltyStatus(tenantId: string) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('No autenticado');
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('tenant_id, loyalty_points')
            .eq('id', user.id)
            .single();

        if (profileError) {
            throw profileError;
        }

        if (!profile) {
            throw new Error('Perfil no encontrado');
        }

        // Use the tenantId from subdomain context, not from profile
        const { data: rewards, error: rewardsError } = await supabase.rpc('get_available_rewards', {
            p_client_id: user.id,
            p_tenant_id: tenantId
        });

        if (rewardsError) {
            throw rewardsError;
        }

        return {
            success: true,
            data: {
                current_points: profile.loyalty_points || 0,
                available_rewards: rewards || []
            }
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error al obtener tu estado de lealtad';
        return {
            success: false,
            error: message
        };
    }
}
