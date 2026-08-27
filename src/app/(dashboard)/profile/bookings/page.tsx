import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import BookingsList, { type Booking } from '@/components/BookingsList'
import {
  createBookingListItems,
  type AccommodationBookingRow,
  type CanonicalBookingRow,
  type FlightBookingRow,
  type TripSummaryRow,
} from '@/lib/booking-list'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Bookings | Baha Buddy',
  description: 'View all your flight and hotel bookings across your Bahamas trips.',
  robots: { index: false },
}

/**
 * /profile/bookings — flight + hotel bookings across all trips (C.10).
 *
 * Changes from the pre-C.10 version:
 *   - Moved into the (dashboard) route group → wrapped by shell
 *   - Removed standalone sticky header (sidebar handles primary nav now)
 *   - Removed <ChatWidget /> (shell provides docked panel + floating button)
 *   - Kept the same data fetching + <BookingsList> component
 *
 * D.7 cleanup: Booking interface now lives next to BookingsList component
 * (the UI-facing shape), and this page imports the type. Inverts the
 * previous dependency direction.
 *
 * Inline back link goes to /profile rather than /dashboard since this is
 * a child of profile.
 */

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trips } = await supabase
    .from('trips')
    .select('id, name')
    .eq('user_id', user.id)

  const tripList = (trips ?? []) as TripSummaryRow[]
  const tripIds = tripList.map(t => t.id)

  let bookings: Booking[] = []

  if (tripIds.length > 0) {
    const [bookingsRes, flightsRes, accRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, trip_id, booking_type, type, provider, status, amount, currency, paid_at, stripe_payment_intent_id, booking_ref, booking_reference, external_reference, reference_id, financial_metadata, created_at')
        .in('trip_id', tripIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('trip_flights')
        .select('id, trip_id, origin, destination, airline, departure_at, arrival_at, price, booking_reference, stripe_payment_intent_id')
        .in('trip_id', tripIds)
        .order('departure_at', { ascending: false }),
      supabase
        .from('trip_accommodations')
        .select('id, trip_id, name, island, check_in, check_out, price_per_night, total_price, currency, status, booking_reference, stripe_payment_intent_id')
        .in('trip_id', tripIds)
        .order('check_in', { ascending: false }),
    ])

    const canonicalBookings = (bookingsRes.data ?? []) as CanonicalBookingRow[]
    const flights = (flightsRes.data ?? []) as FlightBookingRow[]
    const accommodations = (accRes.data ?? []) as AccommodationBookingRow[]

    bookings = createBookingListItems({
      bookings: canonicalBookings,
      trips: tripList,
      flights,
      accommodations,
    })
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Inline back link to parent /profile */}
      <div className="mb-6">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-night transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Profile
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-night">My Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">
          {bookings.length === 0
            ? "Flights and hotels you book will show up here."
            : `${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'} across your trips.`}
        </p>
      </div>

      <BookingsList bookings={bookings} />
    </main>
  )
}
