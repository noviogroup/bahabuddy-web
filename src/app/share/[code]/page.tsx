import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BahaLogo } from '@/components/ui'
import { Trip, TripFlight, TripAccommodation, TripActivity } from '@/types/database'
import type { Metadata } from 'next'

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

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const supabase = await createClient()
  const { data: shareLink } = await supabase
    .from('share_links')
    .select('trip_id')
    .eq('short_code', params.code)
    .single()

  if (!shareLink) return { title: 'Shared Trip — Baha Buddy' }

  const { data: trip } = await supabase
    .from('trips')
    .select('name, islands')
    .eq('id', shareLink.trip_id)
    .single()

  if (!trip) return { title: 'Shared Trip — Baha Buddy' }

  return {
    title: `${trip.name} — Baha Buddy`,
    description: `Check out this Bahamas trip: ${trip.name}${trip.islands?.length ? ` visiting ${trip.islands.join(', ')}` : ''}`,
  }
}

export default async function SharePage({ params }: { params: { code: string } }) {
  const supabase = await createClient()

  const { data: shareLink } = await supabase
    .from('share_links')
    .select('trip_id, share_type, expires_at')
    .eq('short_code', params.code)
    .single()

  if (!shareLink) notFound()

  const isCollaborative = shareLink.share_type === 'collaborative'
  const isExpired = shareLink.expires_at ? new Date(shareLink.expires_at) < new Date() : false
  if (isExpired) notFound()

  // Increment view count via raw SQL increment (fire-and-forget)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase.rpc('increment_share_view' as any, { code: params.code }).then(() => {})

  const [tripRes, flightsRes, accRes, activitiesRes] = await Promise.all([
    supabase.from('trips').select('*').eq('id', shareLink.trip_id).single(),
    supabase.from('trip_flights').select('*').eq('trip_id', shareLink.trip_id).order('departure_at'),
    supabase.from('trip_accommodations').select('*').eq('trip_id', shareLink.trip_id).order('check_in'),
    supabase.from('trip_activities').select('*').eq('trip_id', shareLink.trip_id).order('day_number').order('sort_order'),
  ])

  if (!tripRes.data) notFound()

  const trip = tripRes.data as Trip
  const flights = (flightsRes.data ?? []) as TripFlight[]
  const accommodations = (accRes.data ?? []) as TripAccommodation[]
  const activities = (activitiesRes.data ?? []) as TripActivity[]

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-brand-50">
      <header className="bg-white/80 backdrop-blur border-b border-brand-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <BahaLogo href="/" size="sm" />
          <Link
            href="/login"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Plan your own trip →
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {isCollaborative && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl px-5 py-4">
            <p className="font-semibold text-purple-900 text-sm">You&apos;ve been invited to view this trip</p>
            <p className="text-purple-600 text-xs mt-0.5">Read-only access — you can see all the details but can&apos;t make changes.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-brand-100 overflow-hidden">
          {trip.hero_image_url && (
            <div className="h-48">
              <img src={trip.hero_image_url} alt={trip.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">{trip.name}</h1>
            {(trip.date_start || trip.date_end) && (
              <p className="text-gray-500 mt-1">{fmt(trip.date_start)} → {fmt(trip.date_end)}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {trip.islands?.map(island => (
                <span key={island} className="bg-brand-50 text-brand-700 text-sm px-3 py-1 rounded-full">
                  {island}
                </span>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-sm text-gray-500">
              <span>{trip.party_size} {trip.party_type}</span>
              <span className="capitalize">{trip.status}</span>
            </div>
          </div>
        </div>

        {flights.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">✈️ Flights</h2>
            <div className="space-y-3">
              {flights.map(f => (
                <div key={f.id} className="bg-white rounded-xl border border-brand-100 p-4">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{f.origin}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold">{f.destination}</span>
                    {f.airline && <span className="text-sm text-gray-500 ml-auto">{f.airline}</span>}
                  </div>
                  <div className="flex gap-4 mt-1 text-sm text-gray-500">
                    {f.departure_at && <span>{fmtDatetime(f.departure_at)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {accommodations.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Where we&apos;re staying</h2>
            <div className="space-y-3">
              {accommodations.map(a => (
                <div key={a.id} className="bg-white rounded-xl border border-brand-100 p-4">
                  <h3 className="font-semibold text-gray-900">{a.name}</h3>
                  {a.island && <p className="text-sm text-gray-500">{a.island}</p>}
                  {(a.check_in || a.check_out) && (
                    <p className="text-sm text-gray-500 mt-1">{fmt(a.check_in)} → {fmt(a.check_out)}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {activities.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">The plan</h2>
            <div className="bg-white rounded-xl border border-brand-100 p-4 space-y-3">
              {activities.map(a => (
                <div key={a.id} className="flex gap-2 text-sm">
                  <span className="text-gray-400 shrink-0">Day {a.day_number} · {a.time_slot}</span>
                  <span className="text-gray-700">{a.activity_name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="bg-brand-600 rounded-2xl p-6 text-center text-white">
          <p className="font-semibold text-lg mb-1">Plan your own Bahamas trip</p>
          <p className="text-brand-200 text-sm mb-4">AI-powered itineraries, deals, and more.</p>
          <Link
            href="/"
            className="inline-block bg-white text-brand-700 font-medium px-6 py-2.5 rounded-full hover:bg-brand-50 transition-colors text-sm"
          >
            Get Baha Buddy
          </Link>
        </div>
      </main>
    </div>
  )
}
