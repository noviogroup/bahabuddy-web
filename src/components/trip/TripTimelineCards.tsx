import Link from 'next/link'
import type { Trip, TripAccommodation, TripActivity, TripFlight } from '@/types/database'
import EmptySlotChatLink from '@/components/EmptySlotChatLink'

type Slot = TripActivity['time_slot']

interface TripTimelineCardsProps {
  trip: Trip
  flights: TripFlight[]
  accommodations: TripAccommodation[]
  activities: TripActivity[]
  primaryIsland?: string
}

function fmtDate(d: string | null) {
  if (!d) return 'Add date'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(d: string | null) {
  if (!d) return 'Add time'
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtMoney(n: number | null) {
  if (!n) return 'Price pending'
  return `$${n.toLocaleString()}`
}

function islandQuery(island?: string) {
  return island ? `?island=${encodeURIComponent(island)}` : ''
}

export function groupActivitiesByDay(activities: TripActivity[]) {
  const days: Record<number, Record<Slot, TripActivity[]>> = {}
  for (const activity of activities) {
    if (!days[activity.day_number]) {
      days[activity.day_number] = { morning: [], afternoon: [], evening: [] }
    }
    days[activity.day_number][activity.time_slot].push(activity)
  }
  return days
}

export function tripTimelineDayCount(activities: TripActivity[], trip: Trip): number {
  let max = 0
  for (const activity of activities) max = Math.max(max, activity.day_number ?? 0)

  if (trip.date_start && trip.date_end) {
    const days = Math.ceil(
      (new Date(trip.date_end).getTime() - new Date(trip.date_start).getTime()) / 86_400_000,
    ) + 1
    max = Math.max(max, days)
  }

  return max
}

function ReadinessCard({
  label,
  state,
  body,
  href,
  action,
  tone = 'brand',
}: {
  label: string
  state: string
  body: string
  href: string
  action: string
  tone?: 'brand' | 'palm' | 'gold'
}) {
  const toneClass = tone === 'palm'
    ? 'bg-palm-50 text-palm-700 ring-palm-200'
    : tone === 'gold'
      ? 'bg-gold-50 text-gold-800 ring-gold-200'
      : 'bg-brand-50 text-brand-700 ring-brand-200'

  return (
    <div className="rounded-baha-md border border-sand-200 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gray-400">{label}</p>
          <p className="mt-1 text-sm font-extrabold text-night">{state}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${toneClass}`}>
          {tone === 'palm' ? 'Added' : 'Action'}
        </span>
      </div>
      <p className="mt-2 text-sm leading-5 text-gray-500">{body}</p>
      <Link href={href} className="mt-3 inline-flex text-sm font-extrabold text-brand-700 hover:text-brand-800">
        {action}
      </Link>
    </div>
  )
}

function TripReadinessStrip({
  trip,
  flights,
  accommodations,
  activities,
  primaryIsland,
}: TripTimelineCardsProps) {
  const hasFlights = flights.length > 0
  const hasStay = accommodations.length > 0
  const hasPlan = activities.length > 0
  const islandSuffix = primaryIsland ? ` for ${primaryIsland}` : ''

  return (
    <section className="rounded-baha-lg border border-brand-100 bg-brand-50/40 p-4 shadow-soft">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-700">Trip readiness</p>
          <h2 className="mt-1 text-lg font-extrabold text-night">What still needs attention</h2>
        </div>
        <p className="text-sm font-semibold text-gray-500">{trip.name}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ReadinessCard
          label="Flights"
          state={hasFlights ? `${flights.length} flight ${flights.length === 1 ? 'item' : 'items'} added` : 'Flight needed'}
          body={hasFlights ? 'Review timing, route, and reference before travel.' : `Compare live fares${islandSuffix} and add the best option to this trip.`}
          href="/flights"
          action={hasFlights ? 'Compare other fares' : 'Compare flights'}
          tone={hasFlights ? 'palm' : 'brand'}
        />
        <ReadinessCard
          label="Stay"
          state={hasStay ? `${accommodations.length} stay ${accommodations.length === 1 ? 'item' : 'items'} added` : 'Stay needed'}
          body={hasStay ? 'Check dates, guests, nightly price, and booking reference.' : `Shortlist hotels, resorts, homes, or villas${islandSuffix}.`}
          href={`/stays${islandQuery(primaryIsland)}`}
          action={hasStay ? 'Find alternatives' : 'Find a stay'}
          tone={hasStay ? 'palm' : 'gold'}
        />
        <ReadinessCard
          label="Day plan"
          state={hasPlan ? `${activities.length} experience ${activities.length === 1 ? 'added' : 'items added'}` : 'Days need plans'}
          body={hasPlan ? 'Open gaps below to add food, beaches, tours, and culture around the trip.' : 'Browse experiences first; ask Buddy only when you need help narrowing the choices.'}
          href={`/explore/places${islandQuery(primaryIsland)}`}
          action={hasPlan ? 'Browse more ideas' : 'Browse experiences'}
          tone={hasPlan ? 'palm' : 'brand'}
        />
      </div>
    </section>
  )
}

function FlightTimelineCard({ flight }: { flight: TripFlight }) {
  const booked = Boolean(flight.booking_reference)

  return (
    <article className="rounded-baha-md border border-gray-200 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-night">
              {flight.origin} to {flight.destination}
            </h3>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
              booked ? 'bg-palm-50 text-palm-700 ring-palm-200' : 'bg-gold-50 text-gold-800 ring-gold-200'
            }`}>
              {booked ? 'Booked' : 'Saved flight'}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-500">
            {flight.airline ?? 'Airline pending'}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm font-extrabold text-palm-700">{fmtMoney(flight.price)}</p>
          {flight.booking_reference && (
            <p className="mt-1 text-xs font-mono text-gray-500">Ref {flight.booking_reference}</p>
          )}
        </div>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        <TimelineFact label="Depart" value={fmtDateTime(flight.departure_at)} />
        <TimelineFact label="Arrive" value={fmtDateTime(flight.arrival_at)} />
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
        <Link href="/flights" className="rounded-full bg-brand-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-700">
          Compare flights
        </Link>
      </div>
    </article>
  )
}

function StayTimelineCard({ stay, primaryIsland }: { stay: TripAccommodation; primaryIsland?: string }) {
  const booked = Boolean(stay.booking_reference)
  const stayIsland = stay.island ?? primaryIsland

  return (
    <article className="rounded-baha-md border border-gray-200 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-night">{stay.name}</h3>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
              booked ? 'bg-palm-50 text-palm-700 ring-palm-200' : 'bg-gold-50 text-gold-800 ring-gold-200'
            }`}>
              {booked ? 'Booked' : 'Saved stay'}
            </span>
          </div>
          {stayIsland && <p className="mt-1 text-sm font-semibold text-gray-500">{stayIsland}</p>}
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm font-extrabold text-palm-700">
            {stay.price_per_night ? `${fmtMoney(stay.price_per_night)}/night` : 'Rate pending'}
          </p>
          {stay.booking_reference && (
            <p className="mt-1 text-xs font-mono text-gray-500">Ref {stay.booking_reference}</p>
          )}
        </div>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-3">
        <TimelineFact label="Check-in" value={fmtDate(stay.check_in)} />
        <TimelineFact label="Check-out" value={fmtDate(stay.check_out)} />
        <TimelineFact label="Guests" value={stay.guests ? `${stay.guests}` : 'Guest count pending'} />
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
        <Link href={`/stays${islandQuery(stayIsland)}`} className="rounded-full bg-brand-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-700">
          Find stays
        </Link>
      </div>
    </article>
  )
}

function TimelineFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-offwhite px-3 py-2">
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-night">{value}</dd>
    </div>
  )
}

export default function TripTimelineCards({
  trip,
  flights,
  accommodations,
  activities,
  primaryIsland,
}: TripTimelineCardsProps) {
  const dayGroups = groupActivitiesByDay(activities)
  const totalDays = tripTimelineDayCount(activities, trip)

  return (
    <div className="space-y-6">
      <TripReadinessStrip
        trip={trip}
        flights={flights}
        accommodations={accommodations}
        activities={activities}
        primaryIsland={primaryIsland}
      />

      {flights.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-400">Transport</p>
              <h2 className="text-lg font-extrabold text-night">Flights</h2>
            </div>
            <Link href="/flights" className="text-sm font-extrabold text-brand-700 hover:text-brand-800">
              Compare fares
            </Link>
          </div>
          <div className="space-y-3">
            {flights.map((flight) => <FlightTimelineCard key={flight.id} flight={flight} />)}
          </div>
        </section>
      )}

      {accommodations.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-400">Where you sleep</p>
              <h2 className="text-lg font-extrabold text-night">Stays</h2>
            </div>
            <Link href={`/stays${islandQuery(primaryIsland)}`} className="text-sm font-extrabold text-brand-700 hover:text-brand-800">
              Find alternatives
            </Link>
          </div>
          <div className="space-y-3">
            {accommodations.map((stay) => (
              <StayTimelineCard key={stay.id} stay={stay} primaryIsland={primaryIsland} />
            ))}
          </div>
        </section>
      )}

      {totalDays > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-400">Daily flow</p>
              <h2 className="text-lg font-extrabold text-night">Itinerary</h2>
            </div>
            <Link href={`/explore/places${islandQuery(primaryIsland)}`} className="text-sm font-extrabold text-brand-700 hover:text-brand-800">
              Browse ideas
            </Link>
          </div>
          <div className="space-y-4">
            {Array.from({ length: totalDays }, (_, idx) => idx + 1).map((dayNum) => {
              const slots = dayGroups[dayNum] ?? { morning: [], afternoon: [], evening: [] }

              return (
                <div key={dayNum} className="rounded-baha-md border border-gray-200 bg-white p-4 shadow-soft">
                  <h3 className="mb-3 text-base font-extrabold text-night">Day {dayNum}</h3>
                  {(['morning', 'afternoon', 'evening'] as const).map((slot) => {
                    const items = slots[slot] ?? []

                    return (
                      <div key={slot} className="mb-4 last:mb-0">
                        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-gray-400">{slot}</p>
                        {items.length > 0 ? (
                          <ul className="space-y-2">
                            {items.map((item) => (
                              <li key={item.id} className="rounded-2xl bg-offwhite px-3 py-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="text-sm font-extrabold text-night">{item.activity_name}</p>
                                    {item.notes && <p className="mt-1 text-sm leading-5 text-gray-500">{item.notes}</p>}
                                  </div>
                                  {item.activity_type && (
                                    <span className="w-fit rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-700 ring-1 ring-brand-100">
                                      {item.activity_type}
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <EmptySlotChatLink
                            tripId={trip.id}
                            dayNumber={dayNum}
                            slot={slot}
                            tripName={trip.name}
                            island={primaryIsland}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
