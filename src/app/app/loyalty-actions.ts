'use server'

import { createClient } from '@/utils/supabase/server';

export async function getMyLoyaltyStatus() {
    const supabase = await createClient();

    try {
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log('❌ No hay usuario autenticado');
            throw new Error('No autenticado');
        }

        console.log('✅ Usuario:', user.id);

        // Obtener tenant del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('tenant_id, loyalty_points')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('❌ Error obteniendo perfil:', profileError);
            throw profileError;
        }

        if (!profile) {
            console.error('❌ Perfil no encontrado');
            throw new Error('Perfil no encontrado');
        }

        console.log('✅ Perfil:', profile);

        // Obtener recompensas disponibles
        const { data: rewards, error: rewardsError } = await supabase.rpc('get_available_rewards', {
            p_client_id: user.id,
            p_tenant_id: profile.tenant_id
        });

        if (rewardsError) {
            console.error('❌ Error obteniendo recompensas:', rewardsError);
            throw rewardsError;
        }

        console.log('✅ Recompensas encontradas:', rewards?.length || 0);

        return {
            success: true,
            data: {
                current_points: profile.loyalty_points || 0,
                available_rewards: rewards || []
            }
        };
    } catch (error: any) {
        console.error('❌ Error completo:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener tu estado de lealtad'
        };
    }
}
