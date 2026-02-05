import { getBookingForRating } from './actions'
import RatingClient from './RatingClient'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ bookingId: string }>
    searchParams: Promise<{ r?: string }>
}

export default async function RatingPage({ params, searchParams }: PageProps) {
    const { bookingId } = await params
    const { r: initialRating } = await searchParams

    const result = await getBookingForRating(bookingId)

    if (result.error === 'Reserva no encontrada') {
        notFound()
    }

    // Extract tenant settings
    const booking = result.booking
    if (!booking) {
        notFound()
    }

    // Safely extract nested data (handle both array and single object from Supabase)
    const tenantRaw = booking.tenant
    const tenant = Array.isArray(tenantRaw) ? tenantRaw[0] : tenantRaw
    const service = Array.isArray(booking.services) ? booking.services[0] : booking.services
    const staff = Array.isArray(booking.staff) ? booking.staff[0] : booking.staff
    const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer

    const googleReviewUrl = (tenant?.settings as { google_review_url?: string })?.google_review_url || ''

    // If already rated, show thank you message
    if (result.error === 'already_rated') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">✅</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Ya calificaste esta visita</h1>
                    <p className="text-zinc-400">Gracias por compartir tu opinión con nosotros.</p>
                </div>
            </div>
        )
    }

    return (
        <RatingClient
            bookingId={bookingId}
            tenantName={tenant?.name || 'Negocio'}
            serviceName={(service as { name?: string })?.name || 'Servicio'}
            staffName={(staff as { full_name?: string })?.full_name || ''}
            googleReviewUrl={googleReviewUrl}
            tenantId={booking.tenant_id}
            customerId={(customer as { id?: string })?.id}
            guestName={booking.guest_name || (customer as { full_name?: string })?.full_name}
            guestEmail={booking.guest_email || (customer as { email?: string })?.email}
            initialRating={initialRating ? parseInt(initialRating) : undefined}
        />
    )
}
