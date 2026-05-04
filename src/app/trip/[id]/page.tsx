import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Trip, TripFlight, TripAccommodation, TripActivity } from '@/types/database'
import ShareButton from '@/components/ShareButton'
import ChatWidget from '@/components/ChatWidget'

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

function groupActivities(activities: TripActivity[]) {
  const days: Record<number, Record<string, TripActivity[]>> = {}
  for (const a of activities) {
    if (!days[a.day_number]) days[a.day_number] = { morning: [], afternoon: [], evening: [] }
    days[a.day_number][a.time_slot].push(a)
  }
  return days
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            ← Back
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/" className="text-sm font-bold text-brand-900">Baha Buddy</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Trip Header */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {trip.hero_image_url && (
            <div className="h-48 bg-brand-100">
              <img src={trip.hero_image_url} alt={trip.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{trip.name}</h1>
                {(trip.date_start || trip.date_end) && (
                  <p className="text-gray-500 mt-1">
                    {fmt(trip.date_start)} → {fmt(trip.date_end)}
                  </p>
                )}
              </div>
              <ShareButton tripId={trip.id} />
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {trip.islands?.map(island => (
                <span key={island} className="bg-brand-50 text-brand-700 text-sm px-3 py-1 rounded-full">
                  {island}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Party</p>
                <p className="text-sm font-medium text-gray-700 mt-0.5">
                  {trip.party_size} {trip.party_type}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
                <p className="text-sm font-medium text-gray-700 mt-0.5 capitalize">{trip.status}</p>
              </div>
              {trip.budget_estimate && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Budget</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">
                    ${trip.budget_estimate.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Flights */}
        {flights.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">✈️ Flights</h2>
            <div className="space-y-3">
              {flights.map(f => (
                <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{f.origin}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-semibold text-gray-900">{f.destination}</span>
                    </div>
                    {f.airline && (
                      <span className="text-sm text-gray-500">{f.airline}</span>
                    )}
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
                  {f.price && (
                    <p className="text-sm text-green-600 font-medium mt-1">${f.price.toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Accommodations */}
        {accommodations.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">🏨 Accommodations</h2>
            <div className="space-y-3">
              {accommodations.map(a => (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{a.name}</h3>
                      {a.island && <p className="text-sm text-gray-500">{a.island}</p>}
                    </div>
                    {a.price_per_night && (
                      <span className="text-sm font-medium text-green-600 shrink-0">
                        ${a.price_per_night}/night
                      </span>
                    )}
                  </div>
                  {(a.check_in || a.check_out) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {fmt(a.check_in)} → {fmt(a.check_out)}
                    </p>
                  )}
                  {a.booking_reference && (
                    <p className="mt-2 text-xs font-mono bg-gray-50 px-2 py-1 rounded inline-block text-gray-600">
                      Ref: {a.booking_reference}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Itinerary */}
        {activities.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">🗓 Itinerary</h2>
            <div className="space-y-4">
              {Object.entries(dayGroups)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([day, slots]) => (
                  <div key={day} className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Day {day}</h3>
                    {(['morning', 'afternoon', 'evening'] as const).map(slot => {
                      const items = slots[slot] ?? []
                      if (items.length === 0) return null
                      return (
                        <div key={slot} className="mb-3 last:mb-0">
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 capitalize">{slot}</p>
                          <ul className="space-y-1">
                            {items.map(item => (
                              <li key={item.id} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="text-gray-300 mt-0.5">•</span>
                                <span>
                                  {item.activity_name}
                                  {item.notes && (
                                    <span className="text-gray-400 ml-1">— {item.notes}</span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                ))}
            </div>
          </section>
        )}

        {flights.length === 0 && accommodations.length === 0 && activities.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <p className="text-gray-400 text-sm">
              No details yet — keep planning on the Baha Buddy app.
            </p>
          </div>
        )}
      </main>
      <ChatWidget tripContext={{ name: trip.name, islands: trip.islands ?? [], date_start: trip.date_start ?? undefined, date_end: trip.date_end ?? undefined }} />
    </div>
  )
}
