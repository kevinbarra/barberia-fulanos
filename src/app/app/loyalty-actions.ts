'use server'

import { createClient } from '@/utils/supabase/server';

export async function getMyLoyaltyStatus(tenantId: string) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('No autenticado');
        }

        // Compute tenant-specific points from transactions (ISOLATED)
        // This replaces profile.loyalty_points which is a global column
        const { data: pointsData } = await supabase
            .from('transactions')
            .select('points_earned')
            .eq('client_id', user.id)
            .eq('tenant_id', tenantId);

        const tenantPoints = (pointsData || []).reduce(
            (sum, tx) => sum + (tx.points_earned || 0), 0
        );

        // Use the tenantId from subdomain context for rewards
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
                current_points: tenantPoints,
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
