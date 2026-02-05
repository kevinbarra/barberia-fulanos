import { createAdminClient } from '@/utils/supabase/admin'
import { sendRatingRequestEmail } from '@/lib/email'
import { DEFAULT_TIMEZONE } from '@/lib/constants'

// Types for Supabase relations
type ServiceRelation = { name: string } | { name: string }[] | null
type StaffRelation = { full_name: string } | { full_name: string }[] | null
type TenantRelation = { name: string; slug: string } | { name: string; slug: string }[] | null
type CustomerRelation = { full_name: string; email: string } | { full_name: string; email: string }[] | null

function getFirst<T>(relation: T | T[] | null): T | null {
    if (!relation) return null
    if (Array.isArray(relation)) return relation[0] || null
    return relation
}

export async function GET(request: Request) {
    // Verify Vercel Cron authorization
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
            return new Response('Unauthorized', { status: 401 })
        }
    }

    const supabase = createAdminClient()

    // Find bookings completed today (status = 'completed' and updated today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    // Get bookings that are completed and haven't been rated yet
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            start_time,
            status,
            rated_at,
            guest_name,
            guest_email,
            service:services(name),
            staff:profiles!bookings_staff_id_fkey(full_name),
            tenant:tenants(name, slug),
            customer:profiles!bookings_customer_id_fkey(full_name, email)
        `)
        .eq('status', 'completed')
        .is('rated_at', null)
        .gte('start_time', today.toISOString())
        .lt('start_time', todayEnd.toISOString())

    if (error) {
        console.error('[rating-requests] Error fetching bookings:', error)
        return Response.json({ error: error.message }, { status: 500 })
    }

    if (!bookings || bookings.length === 0) {
        return Response.json({ message: 'No completed bookings to send rating requests', count: 0 })
    }

    let sentCount = 0
    const results: { bookingId: string; success: boolean; email?: string }[] = []

    for (const booking of bookings) {
        const customer = getFirst(booking.customer as CustomerRelation)
        const service = getFirst(booking.service as ServiceRelation)
        const staff = getFirst(booking.staff as StaffRelation)
        const tenant = getFirst(booking.tenant as TenantRelation)

        // Get email (prefer guest_email, fallback to customer email)
        const clientEmail = booking.guest_email || customer?.email
        const clientName = booking.guest_name || customer?.full_name || 'Cliente'

        if (!clientEmail) {
            results.push({ bookingId: booking.id, success: false })
            continue
        }

        // Send rating request email
        const result = await sendRatingRequestEmail({
            clientName,
            clientEmail,
            serviceName: service?.name || 'Servicio',
            barberName: staff?.full_name || 'Tu barbero',
            bookingId: booking.id,
            businessName: tenant?.name || 'AgendaBarber',
            tenantSlug: tenant?.slug
        })

        if (result?.success) {
            sentCount++
        }
        results.push({ bookingId: booking.id, success: result?.success || false, email: clientEmail })
    }

    return Response.json({
        message: 'Rating requests sent',
        total: bookings.length,
        sent: sentCount,
        results
    })
}
