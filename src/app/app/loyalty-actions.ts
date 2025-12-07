'use server'

import { createClient } from '@/utils/supabase/server';

export async function getMyLoyaltyStatus() {
    const supabase = await createClient();

    try {
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        // Obtener tenant del usuario
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id, loyalty_points')
            .eq('id', user.id)
            .single();

        if (!profile) throw new Error('Perfil no encontrado');

        // Obtener recompensas disponibles
        const { data: rewards, error } = await supabase.rpc('get_available_rewards', {
            p_client_id: user.id,
            p_tenant_id: profile.tenant_id
        });

        if (error) throw error;

        return {
            success: true,
            data: {
                current_points: profile.loyalty_points || 0,
                available_rewards: rewards || []
            }
        };
    } catch (error: any) {
        console.error('Error getting my loyalty status:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener tu estado de lealtad'
        };
    }
}
