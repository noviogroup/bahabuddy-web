import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Trip, TripFlight, TripAccommodation, TripActivity } from '@/types/database'
import type { Metadata } from 'next'
import { Children, type ReactNode } from 'react'
import MarketplacePublicHeader from '@/components/marketplace/MarketplacePublicHeader'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import Footer from '@/components/Footer'

export const dynamic = 'force-dynamic'

function fmt(d: string | null) {
  if (!d) return '—'
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDatetime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function fmtMoney(amount: number | null) {
  if (amount == null) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

async function createShareClient() {
  const adminClient = createAdminClient()
  if (adminClient) return adminClient
  return createClient()
}

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const supabase = await createShareClient()
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
  const supabase = await createShareClient()

  const { data: shareLink } = await supabase
    .from('share_links')
    .select('trip_id, share_type, expires_at')
    .eq('short_code', params.code)
    .single()

  if (!shareLink) notFound()

  const isCollaborative = shareLink.share_type === 'collaborative'
  const isExpired = shareLink.expires_at ? new Date(shareLink.expires_at) < new Date() : false
  if (isExpired) notFound()

  // Valid public share links expose a read-only trip snapshot. The service role
  // is server-only and keeps RLS strict for normal anonymous trip access.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase.rpc('increment_share_view' as any, { code: params.code }).then(() => {})

  const [tripRes, flightsRes, accRes, activitiesRes] = await Promise.all([
    supabase
      .from('trips')
      .select('id,user_id,name,status,date_start,date_end,islands,party_type,party_size,budget_estimate,budget_actual,hero_image_url,created_at,updated_at')
      .eq('id', shareLink.trip_id)
      .single(),
    supabase
      .from('trip_flights')
      .select('id,trip_id,origin,destination,departure_at,arrival_at,airline,booking_reference,price,created_at')
      .eq('trip_id', shareLink.trip_id)
      .order('departure_at'),
    supabase
      .from('trip_accommodations')
      .select('id,trip_id,name,island,check_in,check_out,price_per_night,guests,booking_reference,created_at')
      .eq('trip_id', shareLink.trip_id)
      .order('check_in'),
    supabase
      .from('trip_activities')
      .select('id,trip_id,day_number,time_slot,activity_name,activity_type,notes,sort_order,created_at')
      .eq('trip_id', shareLink.trip_id)
      .order('day_number')
      .order('sort_order'),
  ])

  if (!tripRes.data) notFound()

  const trip = tripRes.data as Trip
  const flights = (flightsRes.data ?? []) as TripFlight[]
  const accommodations = (accRes.data ?? []) as TripAccommodation[]
  const activities = (activitiesRes.data ?? []) as TripActivity[]

  return (
    <div className="min-h-screen bg-offwhite text-night">
      <MarketplacePublicHeader />
      <CompactPageHeader
        eyebrow="Shared trip"
        title={trip.name}
        subtitle="A read-only Bahamas trip preview from Baha Buddy."
        crumbs={[
          { href: '/', label: 'Home' },
          { label: 'Shared trip' },
        ]}
        actions={(
          <Link
            href="/dashboard"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            Plan your own trip
          </Link>
        )}
      />

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]">
        <section className="space-y-6">
          {isCollaborative && (
            <div className="rounded-3xl border border-brand-100 bg-white px-5 py-4 shadow-soft">
              <p className="text-sm font-bold text-night">You have been invited to view this trip</p>
              <p className="mt-1 text-sm leading-6 text-charcoal">This preview is read-only, so you can review the plan without changing the traveler&apos;s itinerary.</p>
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-soft">
            {trip.hero_image_url && (
              <div className="relative h-72 md:h-96">
                <Image
                  src={trip.hero_image_url}
                  alt={trip.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 44rem"
                  unoptimized
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-hero-bottom p-5 text-white">
                  <p className="text-xs font-bold uppercase text-gold-300">Buddy trip preview</p>
                  <p className="mt-1 text-2xl font-bold">{trip.name}</p>
                </div>
              </div>
            )}
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <TripFact label="Dates" value={trip.date_start || trip.date_end ? `${fmt(trip.date_start)} to ${fmt(trip.date_end)}` : 'Dates flexible'} />
              <TripFact label="Travelers" value={`${trip.party_size} ${trip.party_type}`} />
              <TripFact label="Status" value={trip.status} />
              <TripFact label="Budget" value={fmtMoney(trip.budget_estimate) ?? 'Not set'} />
            </div>
            {trip.islands?.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-4">
                <p className="mb-2 text-xs font-bold uppercase text-gray-500">Islands</p>
                <div className="flex flex-wrap gap-2">
                  {trip.islands.map(island => (
                    <span key={island} className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
                      {island}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <SharedSection title="Flights" empty="No flights have been added to this shared trip yet." count={flights.length}>
            {flights.map(f => (
              <div key={f.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-500">{f.airline ?? 'Flight'}</p>
                    <p className="mt-1 text-lg font-bold text-night">{f.origin} to {f.destination}</p>
                  </div>
                  {fmtMoney(f.price) && (
                    <p className="self-start rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">{fmtMoney(f.price)}</p>
                  )}
                </div>
                <div className="mt-4 grid gap-3 text-sm text-charcoal sm:grid-cols-2">
                  <TripFact label="Departure" value={fmtDatetime(f.departure_at)} compact />
                  <TripFact label="Arrival" value={fmtDatetime(f.arrival_at)} compact />
                </div>
              </div>
            ))}
          </SharedSection>

          <SharedSection title="Where we are staying" empty="No stays have been added to this shared trip yet." count={accommodations.length}>
            {accommodations.map(a => (
              <div key={a.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-night">{a.name}</h3>
                    {a.island && <p className="mt-1 text-sm font-semibold text-charcoal">{a.island}</p>}
                  </div>
                  {fmtMoney(a.price_per_night) && (
                    <p className="self-start rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">{fmtMoney(a.price_per_night)} nightly</p>
                  )}
                </div>
                <div className="mt-4 grid gap-3 text-sm text-charcoal sm:grid-cols-3">
                  <TripFact label="Check in" value={fmt(a.check_in)} compact />
                  <TripFact label="Check out" value={fmt(a.check_out)} compact />
                  <TripFact label="Guests" value={a.guests ? String(a.guests) : 'Not set'} compact />
                </div>
              </div>
            ))}
          </SharedSection>

          <SharedSection title="The plan" empty="No itinerary stops have been added to this shared trip yet." count={activities.length}>
            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-soft">
              <div className="space-y-3">
                {activities.map(a => (
                  <div key={a.id} className="grid gap-2 rounded-2xl bg-offwhite p-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
                    <p className="text-xs font-bold uppercase text-brand-700">Day {a.day_number} {a.time_slot}</p>
                    <div>
                      <p className="font-bold text-night">{a.activity_name}</p>
                      {a.notes && <p className="mt-1 text-sm leading-6 text-charcoal">{a.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SharedSection>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
            <p className="text-xs font-bold uppercase text-brand-700">Trip snapshot</p>
            <div className="mt-4 space-y-3">
              <TripFact label="Flights" value={String(flights.length)} compact />
              <TripFact label="Stays" value={String(accommodations.length)} compact />
              <TripFact label="Plan items" value={String(activities.length)} compact />
            </div>
          </div>

          <div className="rounded-3xl bg-brand-600 p-5 text-white shadow-card">
            <p className="text-lg font-bold">Build your own Bahamas trip</p>
            <p className="mt-2 text-sm leading-6 text-brand-100">Use Buddy to compare islands, plan stays, check flights, and turn ideas into a trip.</p>
            <Link
              href="/"
              className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-white px-4 py-2.5 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50"
            >
              Start planning
            </Link>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  )
}

function TripFact({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className={compact ? '' : 'rounded-2xl bg-offwhite p-3'}>
      <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
      <p className={`mt-1 font-bold text-night ${compact ? 'text-sm' : 'text-base'}`}>{value}</p>
    </div>
  )
}

function SharedSection({
  title,
  empty,
  children,
  count,
}: {
  title: string
  empty: string
  children: ReactNode
  count?: number
}) {
  const items = Children.toArray(children).filter(Boolean)
  const itemCount = count ?? items.length

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-night">{title}</h2>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500 ring-1 ring-gray-200">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>
      {items.length > 0 ? (
        <div className="space-y-3">{items}</div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-5 text-sm font-semibold text-charcoal">
          {empty}
        </div>
      )}
    </section>
  )
}
