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
import TripSuggestionRotator from '@/components/trip/TripSuggestionRotator'
import TripTimelineCards, { tripTimelineDayCount } from '@/components/trip/TripTimelineCards'
import { isStripeConfigured } from '@/lib/stripe/client'
import { resolveDefaultHeaderImage } from '@/lib/default-headers'

export const dynamic = 'force-dynamic'

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr).getTime()
  const now = Date.now()
  const diff = target - now
  if (diff <= 0) return null
  return Math.ceil(diff / 86_400_000)
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
  const totalDays = tripTimelineDayCount(activities, trip)

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
    <TripTimelineCards
      trip={trip}
      flights={flights}
      accommodations={accommodations}
      activities={activities}
      primaryIsland={primaryIsland}
    />
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
                <p className="text-xs text-gray-400 uppercase">Party</p>
                <p className="text-sm font-medium text-gray-700 mt-0.5">{trip.party_size} {trip.party_type}</p>
              </div>
              {totalDays > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Duration</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">{totalDays} {totalDays === 1 ? 'day' : 'days'}</p>
                </div>
              )}
              {trip.budget_estimate && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Budget</p>
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
            <svg className="absolute -bottom-8 -right-8 h-36 w-36 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16l7-3V7a2 2 0 0 1 4 0v6l7 3v2l-7-2v3l2 1.5V22l-4-1-4 1v-1.5L10 19v-3l-7 2v-2Z" />
            </svg>
            <div className="relative flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-brand-100 text-xs font-bold uppercasest">Ready when you are</p>
                <h2 className="text-xl font-bold mt-1">Book this trip</h2>
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
