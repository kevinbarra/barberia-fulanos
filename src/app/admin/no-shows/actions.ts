'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function markNoShow(bookingId: string, reason?: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase.rpc('mark_no_show', {
        p_booking_id: bookingId,
        p_marked_by: user.id,
        p_reason: reason || 'No se presentó'
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/pos');
    revalidatePath('/admin/schedule');
    return { success: true, data };
}

export async function forgiveNoShow(noShowId: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase.rpc('forgive_no_show', {
        p_no_show_id: noShowId,
        p_forgiven_by: user.id
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/clients');
    return { success: true };
}

export async function getClientsWithWarnings() {
    const supabase = await createClient();

    // Obtener tenant_id del usuario actual para filtrar
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) return [];

    // Filtrar solo clientes de MI barbería
    const { data, error } = await supabase
        .from('clients_with_warnings_v2')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('total_no_shows', { ascending: false });

    if (error) throw error;
    return data;
}

export async function getNoShowHistory(email: string) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_no_show_history_by_email', {
        p_email: email
    });

    if (error) throw error;
    return data;
}

export async function resetClientWarnings(email: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    // Verificar rol (doble check en servidor)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin' && profile?.role !== 'owner') {
        return { success: false, error: 'No autorizado' };
    }

    const { error } = await supabase.rpc('reset_warnings_by_email', {
        p_target_email: email,
        p_reset_by: user.id
    });

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/pos');
    revalidatePath('/admin/clients');
    return { success: true };
}
