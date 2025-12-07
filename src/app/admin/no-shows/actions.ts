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

    const { data, error } = await supabase
        .from('clients_with_warnings')
        .select('*')
        .order('no_show_count', { ascending: false });

    if (error) throw error;
    return data;
}

export async function getNoShowHistory(clientId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('no_show_history')
        .select(`
      *,
      booking:bookings(start_time, services(name)),
      marked_by_profile:marked_by(full_name),
      forgiven_by_profile:forgiven_by(full_name)
    `)
        .eq('client_id', clientId)
        .order('marked_at', { ascending: false });

    if (error) throw error;
    return data;
}
