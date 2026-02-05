import { createAdminClient } from '@/utils/supabase/admin'
import { sendWinBackEmail } from '@/lib/email'
import { ROOT_DOMAIN } from '@/lib/constants'

export async function GET(request: Request) {
    // Verify Vercel Cron authorization
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
            return new Response('Unauthorized', { status: 401 })
        }
    }

    const supabase = createAdminClient()

    // Find customers who haven't booked in 21+ days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 21)

    // Get all tenants
    const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, slug')

    if (!tenants || tenants.length === 0) {
        return Response.json({ message: 'No tenants found', count: 0 })
    }

    let totalSent = 0
    const results: { tenantId: string; sent: number }[] = []

    for (const tenant of tenants) {
        // Find customers with completed bookings older than 21 days
        // who don't have any recent bookings
        const { data: inactiveCustomers } = await supabase
            .from('bookings')
            .select(`
                customer_id,
                guest_name,
                guest_email,
                start_time,
                customer:profiles!bookings_customer_id_fkey(full_name, email)
            `)
            .eq('tenant_id', tenant.id)
            .eq('status', 'completed')
            .lt('start_time', cutoffDate.toISOString())
            .order('start_time', { ascending: false })

        if (!inactiveCustomers || inactiveCustomers.length === 0) {
            results.push({ tenantId: tenant.id, sent: 0 })
            continue
        }

        // Group by customer/email to get unique inactive customers
        const emailsSent = new Set<string>()
        let tenantSent = 0

        for (const booking of inactiveCustomers) {
            const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer
            const email = booking.guest_email || customer?.email
            const name = booking.guest_name || customer?.full_name || 'Cliente'

            if (!email || emailsSent.has(email)) continue

            // Check if this customer has any recent bookings
            const { data: recentBooking } = await supabase
                .from('bookings')
                .select('id')
                .eq('tenant_id', tenant.id)
                .or(`customer_id.eq.${booking.customer_id},guest_email.eq.${email}`)
                .gte('start_time', cutoffDate.toISOString())
                .limit(1)

            // Skip if they have a recent booking
            if (recentBooking && recentBooking.length > 0) continue

            // Calculate days since last visit
            const lastVisit = new Date(booking.start_time)
            const daysSince = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))

            // Send win-back email
            const result = await sendWinBackEmail({
                clientName: name,
                clientEmail: email,
                daysSinceLastVisit: daysSince,
                businessName: tenant.name,
                bookingUrl: `https://${tenant.slug}.${ROOT_DOMAIN}/book/${tenant.slug}`
            })

            if (result?.success) {
                emailsSent.add(email)
                tenantSent++
            }
        }

        totalSent += tenantSent
        results.push({ tenantId: tenant.id, sent: tenantSent })
    }

    return Response.json({
        message: 'Win-back campaign completed',
        totalSent,
        results
    })
}
