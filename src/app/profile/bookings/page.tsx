import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import ChatWidget from '@/components/ChatWidget'
import BookingsList from '@/components/BookingsList'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Bookings | Baha Buddy',
  description: 'View all your flight and hotel bookings across your Bahamas trips.',
  robots: { index: false },
}

export interface Booking {
  id: string
  tripId: string
  tripName: string
  type: 'flight' | 'hotel'
  title: string
  subtitle: string | null
  dates: string | null
  price: number | null
  bookingReference: string | null
}

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load all trips for this user
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
      const dep = f.departure_at ? new Date(f.departure_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
      const arr = f.arrival_at ? new Date(f.arrival_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
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
      const checkIn = a.check_in ? new Date(a.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
      const checkOut = a.check_out ? new Date(a.check_out).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/profile" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
            ← Profile
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-bold text-gray-900">My Bookings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <BookingsList bookings={bookings} />
      </main>

      <ChatWidget />
    </div>
  )
}
