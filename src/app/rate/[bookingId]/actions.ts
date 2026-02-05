'use server'

import { createAdminClient } from '@/utils/supabase/admin'

// Get booking details for the rating page (public access)
export async function getBookingForRating(bookingId: string) {
    const supabase = createAdminClient()

    const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
            id,
            start_time,
            rated_at,
            guest_name,
            guest_email,
            tenant_id,
            services:service_id(name, price),
            staff:staff_id(full_name),
            customer:customer_id(full_name, email),
            tenant:tenant_id(
                name,
                slug,
                settings
            )
        `)
        .eq('id', bookingId)
        .single()

    if (error || !booking) {
        return { error: 'Reserva no encontrada' }
    }

    // Check if already rated
    if (booking.rated_at) {
        return { error: 'already_rated', booking }
    }

    return { booking }
}

// Submit feedback (for 1-3 star ratings)
export async function submitFeedback({
    bookingId,
    rating,
    comment,
    tenantId,
    customerId,
    guestName,
    guestEmail
}: {
    bookingId: string
    rating: number
    comment: string
    tenantId: string
    customerId?: string
    guestName?: string
    guestEmail?: string
}) {
    const supabase = createAdminClient()

    // Insert feedback
    const { error: feedbackError } = await supabase
        .from('feedback')
        .insert({
            booking_id: bookingId,
            tenant_id: tenantId,
            customer_id: customerId || null,
            rating,
            comment,
            guest_name: guestName || null,
            guest_email: guestEmail || null
        })

    if (feedbackError) {
        console.error('[submitFeedback] Error:', feedbackError)
        return { error: 'Error al guardar comentario' }
    }

    // Mark booking as rated
    await supabase
        .from('bookings')
        .update({ rated_at: new Date().toISOString() })
        .eq('id', bookingId)

    return { success: true, message: '¡Gracias por tu comentario!' }
}

// Mark booking as rated (for 4-5 star ratings that went to Google)
export async function markBookingRated(bookingId: string) {
    const supabase = createAdminClient()

    const { error } = await supabase
        .from('bookings')
        .update({ rated_at: new Date().toISOString() })
        .eq('id', bookingId)

    if (error) {
        console.error('[markBookingRated] Error:', error)
    }

    return { success: !error }
}
