import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Trip, TripFlight, TripAccommodation, TripActivity } from '@/types/database'
import ShareButton from '@/components/ShareButton'
import InviteCompanions from '@/components/InviteCompanions'
import TripMap from '@/components/TripMap'
import { buildMarkersFromTripData } from '@/lib/trip-map-markers'
import TripTabView from '@/components/TripTabView'
import TripBudget from '@/components/TripBudget'
import TripReceipts from '@/components/TripReceipts'
import TripRealtimeListener from '@/components/TripRealtimeListener'
import TripStatusBadge, { type TripStatus } from '@/components/TripStatusBadge'
import EmptySlotChatLink from '@/components/EmptySlotChatLink'
import TripSuggestionRotator from '@/components/trip/TripSuggestionRotator'
import { isStripeConfigured } from '@/lib/stripe/client'
import { resolveDefaultHeaderImage } from '@/lib/default-headers'

export const dynamic = 'force-dynamic'

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDatetime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr).getTime()
  const now = Date.now()
  const diff = target - now
  if (diff <= 0) return null
  return Math.ceil(diff / 86_400_000)
}

function groupActivities(activities: TripActivity[]) {
  const days: Record<number, Record<string, TripActivity[]>> = {}
  for (const a of activities) {
    if (!days[a.day_number]) days[a.day_number] = { morning: [], afternoon: [], evening: [] }
    days[a.day_number][a.time_slot].push(a)
  }
  return days
}

function tripDayCount(activities: TripActivity[], trip: Trip): number {
  let max = 0
  for (const a of activities) max = Math.max(max, a.day_number ?? 0)
  if (trip.date_start && trip.date_end) {
    const days = Math.ceil(
      (new Date(trip.date_end).getTime() - new Date(trip.date_start).getTime()) / 86_400_000,
    ) + 1
    max = Math.max(max, days)
  }
  return max
}

function isBookable(trip: Trip): boolean {
  const status = (trip.status ?? 'draft').toLowerCase()
  if (status !== 'draft' && status !== 'planned') return false
  if (!trip.budget_estimate || trip.budget_estimate < 1) return false
  return true
}

export default async function TripPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tripRes, flightsRes, accRes, activitiesRes] = await Promise.all([
    supabase.from('trips').select('*').eq('id', params.id).single(),
    supabase.from('trip_flights').select('*').eq('trip_id', params.id).order('departure_at'),
    supabase.from('trip_accommodations').select('*').eq('trip_id', params.id).order('check_in'),
    supabase.from('trip_activities').select('*').eq('trip_id', params.id).order('day_number').order('sort_order'),
  ])

  if (!tripRes.data) notFound()
  if (tripRes.data.user_id !== user.id) notFound()

  const trip = tripRes.data as Trip
  const flights = (flightsRes.data ?? []) as TripFlight[]
  const accommodations = (accRes.data ?? []) as TripAccommodation[]
  const activities = (activitiesRes.data ?? []) as TripActivity[]
  const dayGroups = groupActivities(activities)
  const totalDays = tripDayCount(activities, trip)

  const mapMarkers = buildMarkersFromTripData(activities, accommodations, flights)

  const flightTotal = flights.reduce((sum, f) => sum + (f.price ?? 0), 0)
  const hotelTotal = accommodations.reduce((sum, a) => {
    if (!a.price_per_night) return sum
    const nights = a.check_in && a.check_out
      ? Math.max(1, Math.round((new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 86400000))
      : 1
    return sum + a.price_per_night * nights
  }, 0)

  const countdown = daysUntil(trip.date_start ?? null)
  const primaryIsland = trip.islands?.[0]
  const bookable = isBookable(trip) && isStripeConfigured
  const tripHeader = await resolveDefaultHeaderImage({
    customImageUrl: trip.hero_image_url,
    island: primaryIsland,
    category: trip.status === 'completed' ? 'Romantic' : 'Local Gems',
    preferredVariant: 'desktop',
  })

  const timelineContent = (
    <div className="space-y-6">
      {flights.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span aria-hidden="true">✈️</span>
            Flights
          </h2>
          <div className="space-y-3">
            {flights.map(f => (
              <div key={f.id} className="bg-white rounded-baha-md border border-gray-200 p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{f.origin}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold text-gray-900">{f.destination}</span>
                  </div>
                  {f.airline && <span className="text-sm text-gray-500">{f.airline}</span>}
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                  {f.departure_at && <span>Departs {fmtDatetime(f.departure_at)}</span>}
                  {f.arrival_at && <span>Arrives {fmtDatetime(f.arrival_at)}</span>}
                </div>
                {f.booking_reference && (
                  <p className="mt-2 text-xs font-mono bg-gray-50 px-2 py-1 rounded inline-block text-gray-600">
                    Ref: {f.booking_reference}
                  </p>
                )}
                {f.price && <p className="text-sm text-palm-600 font-medium mt-1">${f.price.toLocaleString()}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {accommodations.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">Accommodations</h2>
          <div className="space-y-3">
            {accommodations.map(a => (
              <div key={a.id} className="bg-white rounded-baha-md border border-gray-200 p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{a.name}</h3>
                    {a.island && <p className="text-sm text-gray-500">{a.island}</p>}
                  </div>
                  {a.price_per_night && <span className="text-sm font-medium text-palm-600 shrink-0">${a.price_per_night}/night</span>}
                </div>
                {(a.check_in || a.check_out) && <p className="text-sm text-gray-500 mt-1">{fmt(a.check_in)} → {fmt(a.check_out)}</p>}
                {a.booking_reference && (
                  <p className="mt-2 text-xs font-mono bg-gray-50 px-2 py-1 rounded inline-block text-gray-600">Ref: {a.booking_reference}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {totalDays > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">Itinerary</h2>
          <div className="space-y-4">
            {Array.from({ length: totalDays }, (_, idx) => idx + 1).map(dayNum => {
              const slots = dayGroups[dayNum] ?? { morning: [], afternoon: [], evening: [] }
              const dayHasContent = slots.morning.length + slots.afternoon.length + slots.evening.length > 0
              return (
                <div key={dayNum} className="bg-white rounded-baha-md border border-gray-200 p-4 shadow-soft">
                  <h3 className="font-semibold text-gray-800 mb-3">Day {dayNum}</h3>
                  {(['morning', 'afternoon', 'evening'] as const).map(slot => {
                    const items = slots[slot] ?? []
                    return (
                      <div key={slot} className="mb-3 last:mb-0">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 capitalize">{slot}</p>
                        {items.length > 0 ? (
                          <ul className="space-y-1">
                            {items.map(item => (
                              <li key={item.id} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="text-gray-300 mt-0.5">•</span>
                                <span>
                                  {item.activity_name}
                                  {item.notes && <span className="text-gray-400 ml-1">— {item.notes}</span>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : dayHasContent ? (
                          <EmptySlotChatLink dayNumber={dayNum} slot={slot} tripName={trip.name} island={primaryIsland} />
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {flights.length === 0 && accommodations.length === 0 && activities.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-soft">
          <p className="text-gray-500 text-sm mb-3">This trip is just an idea right now.</p>
          <p className="text-gray-400 text-xs">Keep planning with Buddy in the chat panel — flights, hotels, and activities will appear here as you add them.</p>
        </div>
      )}
    </div>
  )

  const checkoutHref = bookable
    ? `/dashboard/checkout?trip_id=${encodeURIComponent(trip.id)}` +
      `&amount=${Math.round((trip.budget_estimate ?? 0) * 100)}` +
      `&type=full_trip` +
      `&description=${encodeURIComponent(trip.name)}`
    : null

  return (
    <>
      <TripRealtimeListener tripId={trip.id} />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-night transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-baha-lg border border-gray-200 overflow-hidden shadow-card">
          <div className="h-48 sm:h-56 bg-brand-100 relative">
            <Image
              src={tripHeader.url}
              alt={trip.hero_image_url ? trip.name : tripHeader.alt}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              priority
              className="object-cover"
            />
            {countdown !== null && (
              <div className="absolute top-3 right-3 z-10 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs font-semibold">
                {countdown === 1 ? 'Tomorrow' : `${countdown} days away`}
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <TripStatusBadge status={trip.status as TripStatus} />
                </div>
                <h1 className="text-2xl font-bold text-night">{trip.name}</h1>
                {(trip.date_start || trip.date_end) && <p className="text-gray-500 mt-1 text-sm">{fmt(trip.date_start)} → {fmt(trip.date_end)}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ShareButton tripId={trip.id} />
                <InviteCompanions tripId={trip.id} />
              </div>
            </div>

            {trip.islands && trip.islands.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {trip.islands.map(island => (
                  <span key={island} className="bg-brand-50 text-brand-700 ring-1 ring-brand-200 text-xs font-medium px-2.5 py-1 rounded-full">
                    {island}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Party</p>
                <p className="text-sm font-medium text-gray-700 mt-0.5">{trip.party_size} {trip.party_type}</p>
              </div>
              {totalDays > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Duration</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">{totalDays} {totalDays === 1 ? 'day' : 'days'}</p>
                </div>
              )}
              {trip.budget_estimate && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Budget</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">${trip.budget_estimate.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <TripSuggestionRotator trip={trip} hasItinerary={flights.length > 0 || accommodations.length > 0 || activities.length > 0} />

        <TripTabView
          timelineContent={timelineContent}
          mapContent={<TripMap markers={mapMarkers} />}
          budgetContent={<TripBudget budgetEstimate={trip.budget_estimate} budgetActual={trip.budget_actual} flightTotal={flightTotal} hotelTotal={hotelTotal} />}
          hasMapData={mapMarkers.length > 0}
        />

        {bookable && checkoutHref && (
          <section className="rounded-baha-lg bg-gradient-to-br from-brand-600 to-brand-500 text-white p-6 shadow-card relative overflow-hidden">
            <div className="absolute -bottom-8 -right-8 text-9xl opacity-10 select-none pointer-events-none" aria-hidden="true">✈️</div>
            <div className="relative flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-brand-100 text-xs font-bold uppercase tracking-widest">Ready when you are</p>
                <h2 className="text-xl sm:text-2xl font-extrabold mt-1">Book this trip</h2>
                <p className="text-brand-100 text-sm mt-1">Lock in {trip.name} for ${trip.budget_estimate?.toLocaleString()}.</p>
              </div>
              <Link href={checkoutHref} className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-bold px-5 py-3 rounded-full transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600">
                Continue to checkout
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </section>
        )}

        <TripReceipts tripId={trip.id} />
      </main>
    </>
  )
}
