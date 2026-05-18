import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import BookingsList, { type Booking } from '@/components/BookingsList'

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

  const tripList = trips ?? []
  const tripIds = tripList.map(t => t.id)
  const tripNameById: Record<string, string> = {}
  for (const t of tripList) tripNameById[t.id] = t.name

  const bookings: Booking[] = []

  if (tripIds.length > 0) {
    const [flightsRes, accRes] = await Promise.all([
      supabase
        .from('trip_flights')
        .select('id, trip_id, origin, destination, airline, departure_at, arrival_at, price, booking_reference')
        .in('trip_id', tripIds)
        .order('departure_at', { ascending: false }),
      supabase
        .from('trip_accommodations')
        .select('id, trip_id, name, island, check_in, check_out, price_per_night, booking_reference')
        .in('trip_id', tripIds)
        .order('check_in', { ascending: false }),
    ])

    const flights = flightsRes.data ?? []
    const accommodations = accRes.data ?? []

    for (const f of flights) {
      const dep = f.departure_at
        ? new Date(f.departure_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null
      const arr = f.arrival_at
        ? new Date(f.arrival_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null
      const dates = dep ? (arr && arr !== dep ? `${dep} → ${arr}` : dep) : null
      bookings.push({
        id: f.id,
        tripId: f.trip_id,
        tripName: tripNameById[f.trip_id] ?? 'Unknown Trip',
        type: 'flight',
        title: `${f.origin} → ${f.destination}`,
        subtitle: f.airline ?? null,
        dates,
        price: f.price,
        bookingReference: f.booking_reference,
      })
    }

    for (const a of accommodations) {
      const checkIn = a.check_in
        ? new Date(a.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null
      const checkOut = a.check_out
        ? new Date(a.check_out).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null
      const dates = checkIn ? (checkOut ? `${checkIn} → ${checkOut}` : checkIn) : null
      bookings.push({
        id: a.id,
        tripId: a.trip_id,
        tripName: tripNameById[a.trip_id] ?? 'Unknown Trip',
        type: 'hotel',
        title: a.name,
        subtitle: a.island ?? null,
        dates,
        price: a.price_per_night,
        bookingReference: a.booking_reference,
      })
    }
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
        <h1 className="text-2xl sm:text-3xl font-extrabold text-night">My Bookings</h1>
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
