'use client'

/**
 * HeroSearchPanel — direct-intent hero search for the Home Dashboard.
 *
 * Inspired by the Expedia / Booking.com search hero: a tab strip of
 * categories with a structured form below. Adapted for Baha Buddy's
 * conversation-first product principle by treating the form as a fast
 * lane INTO the experience — not as a replacement for it.
 *
 * Categories:
 *   1. Plan a Trip   → /dashboard/chat (with optional pre-filled prompt)
 *   2. Stays         → /hotels?island=…&checkIn=…&checkOut=…&adults=…&rooms=…
 *   3. Flights       → /flights?origin=…&destination=…&depart=…&return=…&passengers=…
 *   4. Things to Do  → /dashboard/chat?q=<structured prompt> (no native activities page yet)
 *
 * The two surfaces with real search pages (hotels + flights) deep-link
 * straight into pre-filled forms. The rest route through Buddy with a
 * structured opening message so he can run the right tools and respond
 * with cards inside the conversation.
 *
 * Mobile reference: forthcoming Flutter `HeroSearchPanel` widget that
 * will mirror this layout. Web is leading on this surface.
 *
 * Composition: replaces the previous `QuickActionsRow` (chat-mediated
 * quick prompts) + "Or search directly" grid (links to /hotels and
 * /flights). One unified primary action surface.
 */

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BahaDatePicker } from '@/components/ui'

// ─── Reference data ──────────────────────────────────────────────────────────
// Mirrors HotelSearchClient.ISLANDS and FlightSearchClient.BAHAMAS_DESTINATIONS
// so the panel hands off cleanly to either page.

interface Island {
  slug: string
  label: string
  /** Primary airport for flight deep-links. null = no commercial airport. */
  airport: string | null
}

const ISLANDS: readonly Island[] = [
  { slug: 'nassau',          label: 'Nassau',           airport: 'NAS' },
  { slug: 'paradise-island', label: 'Paradise Island',  airport: 'NAS' },
  { slug: 'exuma',           label: 'Exuma',            airport: 'EXU' },
  { slug: 'eleuthera',       label: 'Eleuthera',        airport: 'ELH' },
  { slug: 'harbour-island',  label: 'Harbour Island',   airport: 'ELH' },
  { slug: 'andros',          label: 'Andros',           airport: 'ASD' },
  { slug: 'grand-bahama',    label: 'Grand Bahama',     airport: 'FPO' },
  { slug: 'bimini',          label: 'Bimini',           airport: 'BIM' },
  { slug: 'long-island',     label: 'Long Island',      airport: null },
  { slug: 'abacos',          label: 'The Abacos',       airport: 'MHH' },
]

/** Bahamas airport selector (flights only). Matches FlightSearchClient. */
const FLIGHT_DESTINATIONS: readonly { code: string; label: string }[] = [
  { code: 'NAS', label: 'Nassau (NAS)' },
  { code: 'EXU', label: 'Exuma (EXU)' },
  { code: 'ELH', label: 'North Eleuthera (ELH)' },
  { code: 'GHB', label: 'Governor\u2019s Harbour (GHB)' },
  { code: 'FPO', label: 'Freeport / Grand Bahama (FPO)' },
  { code: 'BIM', label: 'Bimini (BIM)' },
  { code: 'ASD', label: 'Andros (ASD)' },
  { code: 'MHH', label: 'Marsh Harbour / Abacos (MHH)' },
]

/** Origin-city autocomplete options for flights. Mirrors the Duffel-
 *  backed CITY_TO_IATA list used in FlightSearchClient. */
const ORIGIN_SUGGESTIONS: readonly { label: string; value: string }[] = [
  { label: 'Miami (MIA)',           value: 'Miami' },
  { label: 'Fort Lauderdale (FLL)', value: 'Fort Lauderdale' },
  { label: 'New York JFK (JFK)',    value: 'New York' },
  { label: 'Newark (EWR)',          value: 'Newark' },
  { label: 'Atlanta (ATL)',         value: 'Atlanta' },
  { label: 'Charlotte (CLT)',       value: 'Charlotte' },
  { label: 'Dallas (DFW)',          value: 'Dallas' },
  { label: 'Houston (IAH)',         value: 'Houston' },
  { label: 'Chicago (ORD)',         value: 'Chicago' },
  { label: 'Los Angeles (LAX)',     value: 'Los Angeles' },
  { label: 'Boston (BOS)',          value: 'Boston' },
  { label: 'Orlando (MCO)',         value: 'Orlando' },
  { label: 'Toronto (YYZ)',         value: 'Toronto' },
  { label: 'London (LHR)',          value: 'London' },
]

/** Vibe chips for Things to Do — matches AppConstants.travelVibes. */
const ACTIVITY_VIBES: readonly { key: string; label: string }[] = [
  { key: 'beach',      label: 'Beach & Chill' },
  { key: 'adventure',  label: 'Adventure' },
  { key: 'family',     label: 'Family Fun' },
  { key: 'foodie',     label: 'Foodie' },
  { key: 'water',      label: 'Water Sports' },
  { key: 'nightlife',  label: 'Nightlife' },
  { key: 'romance',    label: 'Romance' },
  { key: 'culture',    label: 'Culture' },
  { key: 'luxury',     label: 'Luxury' },
  { key: 'fishing',    label: 'Fishing' },
]

// ─── Tab definitions ─────────────────────────────────────────────────────────

type TabKey = 'plan' | 'stays' | 'flights' | 'things'

interface Tab {
  key: TabKey
  label: string
  icon: ReactNode
}

const ICON_SPARKLE = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </svg>
)

const ICON_BED = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-7a2 2 0 012-2h14a2 2 0 012 2v7M3 14h18M7 11V8a1 1 0 011-1h3a1 1 0 011 1v3" />
  </svg>
)

const ICON_FLIGHT = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16l7-3v-5a2 2 0 014 0v5l7 3v2l-7-2v3l2 1.5V20l-4-1-4 1v-1.5L10 17v-3l-7 2v-2z" />
  </svg>
)

const ICON_TICKET = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v3a2 2 0 100 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 100-4V7a2 2 0 012-2z" />
  </svg>
)

const TABS: readonly Tab[] = [
  { key: 'plan',    label: 'Plan a Trip',  icon: ICON_SPARKLE },
  { key: 'stays',   label: 'Stays',        icon: ICON_BED },
  { key: 'flights', label: 'Flights',      icon: ICON_FLIGHT },
  { key: 'things',  label: 'Things to Do', icon: ICON_TICKET },
]

// ─── Date helpers ────────────────────────────────────────────────────────────

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatShortDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── TravelersPopover ────────────────────────────────────────────────────────
// Adults / Children / Rooms with +/- counters. `mode` controls which
// rows render so the same component works for hotels, flights, and
// activities.

interface TravelersValue {
  adults: number
  children: number
  rooms: number
}

interface TravelersPopoverProps {
  value: TravelersValue
  onChange: (next: TravelersValue) => void
  /** Which rows to show. Flights & activities don't need rooms. */
  mode: 'stays' | 'flights' | 'things'
  /** Optional label shown inside the trigger above the summary. */
  triggerLabel: string
}

function TravelersPopover({ value, onChange, mode, triggerLabel }: TravelersPopoverProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Close on outside click + Escape key.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const totalTravelers = value.adults + value.children
  const summary = useMemo(() => {
    const parts: string[] = []
    parts.push(`${totalTravelers} ${totalTravelers === 1 ? 'traveler' : 'travelers'}`)
    if (mode === 'stays') {
      parts.push(`${value.rooms} ${value.rooms === 1 ? 'room' : 'rooms'}`)
    }
    return parts.join(', ')
  }, [totalTravelers, value.rooms, mode])

  const update = useCallback(
    (key: keyof TravelersValue, delta: number) => {
      const next = { ...value }
      next[key] = Math.max(
        key === 'adults' || key === 'rooms' ? 1 : 0,
        Math.min(next[key] + delta, key === 'rooms' ? 8 : 16),
      )
      // Rooms can't exceed adults (need ≥1 adult per room).
      if (key === 'adults' && next.adults < next.rooms) next.rooms = next.adults
      if (key === 'rooms' && next.rooms > next.adults) next.adults = next.rooms
      onChange(next)
    },
    [value, onChange],
  )

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full text-left rounded-baha-md border border-gray-300 bg-white px-3 py-2.5 hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
      >
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {triggerLabel}
        </span>
        <span className="block text-sm font-medium text-night truncate">
          {summary}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose travelers"
          className="absolute z-30 left-0 right-0 sm:left-auto sm:right-0 sm:w-72 mt-2 bg-white rounded-baha-lg border border-gray-200 shadow-card-hover p-4 animate-fade-in"
        >
          <CounterRow
            label="Adults"
            hint="Age 13+"
            min={1}
            value={value.adults}
            onDec={() => update('adults', -1)}
            onInc={() => update('adults', +1)}
          />
          <CounterRow
            label="Children"
            hint="Ages 0–12"
            min={0}
            value={value.children}
            onDec={() => update('children', -1)}
            onInc={() => update('children', +1)}
          />
          {mode === 'stays' && (
            <CounterRow
              label="Rooms"
              hint="One bed per room"
              min={1}
              value={value.rooms}
              onDec={() => update('rooms', -1)}
              onInc={() => update('rooms', +1)}
            />
          )}
          <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-md hover:bg-brand-50 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface CounterRowProps {
  label: string
  hint: string
  min: number
  value: number
  onDec: () => void
  onInc: () => void
}

function CounterRow({ label, hint, min, value, onDec, onInc }: CounterRowProps) {
  const atMin = value <= min
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-semibold text-night leading-tight">{label}</p>
        <p className="text-xs text-gray-500 leading-tight">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDec}
          disabled={atMin}
          aria-label={`Decrease ${label}`}
          className="w-8 h-8 rounded-full border border-gray-300 text-night hover:border-brand-500 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12" />
          </svg>
        </button>
        <span className="w-6 text-center text-sm font-semibold text-night tabular-nums">{value}</span>
        <button
          type="button"
          onClick={onInc}
          aria-label={`Increase ${label}`}
          className="w-8 h-8 rounded-full border border-gray-300 text-night hover:border-brand-500 hover:text-brand-600 transition-colors flex items-center justify-center"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M6 12h12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function HeroSearchPanel() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('plan')

  // Default departure date — today + 14 (typical Bahamas lead time).
  const today = useMemo(() => new Date(), [])
  const todayIso = useMemo(() => toIsoDate(today), [today])
  const defaultDepart = useMemo(() => toIsoDate(addDays(today, 14)), [today])
  const defaultReturn = useMemo(() => toIsoDate(addDays(today, 19)), [today])
  const defaultCheckIn = useMemo(() => toIsoDate(addDays(today, 14)), [today])
  const defaultCheckOut = useMemo(() => toIsoDate(addDays(today, 18)), [today])

  // ── Plan a Trip state ──
  const [planPrompt, setPlanPrompt] = useState('')

  // ── Stays state ──
  const [staysIsland, setStaysIsland] = useState<string>('nassau')
  const [checkIn, setCheckIn] = useState<string>(defaultCheckIn)
  const [checkOut, setCheckOut] = useState<string>(defaultCheckOut)
  const [staysTravelers, setStaysTravelers] = useState<TravelersValue>({
    adults: 2,
    children: 0,
    rooms: 1,
  })

  // ── Flights state ──
  const [flightTripType, setFlightTripType] = useState<'round_trip' | 'one_way'>('round_trip')
  const [flightOrigin, setFlightOrigin] = useState<string>('Miami')
  const [flightDestination, setFlightDestination] = useState<string>('NAS')
  const [flightDepart, setFlightDepart] = useState<string>(defaultDepart)
  const [flightReturn, setFlightReturn] = useState<string>(defaultReturn)
  const [flightTravelers, setFlightTravelers] = useState<TravelersValue>({
    adults: 2,
    children: 0,
    rooms: 1,
  })
  const [flightCabin, setFlightCabin] = useState<string>('economy')

  // ── Things to Do state ──
  const [thingsIsland, setThingsIsland] = useState<string>('nassau')
  const [thingsDate, setThingsDate] = useState<string>('')
  const [thingsTravelers, setThingsTravelers] = useState<TravelersValue>({
    adults: 2,
    children: 0,
    rooms: 1,
  })
  const [thingsVibes, setThingsVibes] = useState<Set<string>>(new Set())

  // ── Submit handlers ────────────────────────────────────────────────────────

  function submitPlan(e: FormEvent) {
    e.preventDefault()
    const q = planPrompt.trim()
    if (q) router.push(`/dashboard/chat?q=${encodeURIComponent(q)}`)
    else router.push('/dashboard/chat')
  }

  function submitStays(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('island', staysIsland)
    if (checkIn) params.set('checkIn', checkIn)
    if (checkOut) params.set('checkOut', checkOut)
    params.set('adults', String(staysTravelers.adults))
    params.set('children', String(staysTravelers.children))
    params.set('rooms', String(staysTravelers.rooms))
    router.push(`/hotels?${params.toString()}`)
  }

  function submitFlights(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('origin', flightOrigin)
    params.set('destination', flightDestination)
    params.set('depart', flightDepart)
    params.set('tripType', flightTripType)
    if (flightTripType === 'round_trip' && flightReturn) {
      params.set('return', flightReturn)
    }
    params.set('passengers', String(flightTravelers.adults + flightTravelers.children))
    params.set('cabin', flightCabin)
    router.push(`/flights?${params.toString()}`)
  }

  function submitThings(e: FormEvent) {
    e.preventDefault()
    const islandLabel = ISLANDS.find(i => i.slug === thingsIsland)?.label ?? 'the Bahamas'
    const partySize = thingsTravelers.adults + thingsTravelers.children
    const parts: string[] = [`Show me things to do in ${islandLabel}`]
    if (thingsDate) parts.push(`on ${formatShortDate(thingsDate)}`)
    parts.push(`for ${partySize} ${partySize === 1 ? 'person' : 'people'}`)
    if (thingsVibes.size > 0) {
      const vibeLabels = ACTIVITY_VIBES
        .filter(v => thingsVibes.has(v.key))
        .map(v => v.label.toLowerCase())
        .join(', ')
      parts.push(`— I'm into ${vibeLabels}`)
    }
    const q = parts.join(' ') + '.'
    router.push(`/dashboard/chat?q=${encodeURIComponent(q)}`)
  }

  // ── Buddy-side chat fallback (each non-plan tab links to chat too) ────────

  function planFromCurrent(): string {
    switch (activeTab) {
      case 'stays': {
        const islandLabel = ISLANDS.find(i => i.slug === staysIsland)?.label ?? 'the Bahamas'
        const travelers = staysTravelers.adults + staysTravelers.children
        const range = checkIn && checkOut
          ? `from ${formatShortDate(checkIn)} to ${formatShortDate(checkOut)}`
          : ''
        return `Find me hotels in ${islandLabel} ${range} for ${travelers} ${travelers === 1 ? 'traveler' : 'travelers'} in ${staysTravelers.rooms} ${staysTravelers.rooms === 1 ? 'room' : 'rooms'}.`
      }
      case 'flights': {
        const destLabel = FLIGHT_DESTINATIONS.find(d => d.code === flightDestination)?.label ?? flightDestination
        const travelers = flightTravelers.adults + flightTravelers.children
        const ret = flightTripType === 'round_trip' && flightReturn
          ? ` returning ${formatShortDate(flightReturn)}`
          : ''
        return `Find me flights from ${flightOrigin} to ${destLabel} departing ${formatShortDate(flightDepart)}${ret} for ${travelers} ${travelers === 1 ? 'traveler' : 'travelers'}.`
      }
      case 'things': {
        const islandLabel = ISLANDS.find(i => i.slug === thingsIsland)?.label ?? 'the Bahamas'
        const partySize = thingsTravelers.adults + thingsTravelers.children
        return `Show me things to do in ${islandLabel} for ${partySize} ${partySize === 1 ? 'person' : 'people'}.`
      }
      default:
        return planPrompt.trim()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section
      aria-label="Plan or search"
      className="bg-white rounded-baha-xl border border-gray-100 shadow-card overflow-hidden"
    >
      {/* Tab strip */}
      <div role="tablist" aria-label="Search category" className="flex items-stretch gap-1 px-2 pt-2 sm:px-4 sm:pt-3 overflow-x-auto">
        {TABS.map(tab => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              className={`group relative flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                active ? 'text-brand-700' : 'text-gray-500 hover:text-night'
              }`}
            >
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
                  active ? 'bg-brand-50 text-brand-600' : 'text-gray-400 group-hover:text-gray-600'
                }`}
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-2 right-2 -bottom-px h-0.5 bg-brand-600 rounded-full"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Form area */}
      <div className="border-t border-gray-100 p-4 sm:p-5">
        {activeTab === 'plan' && (
          <PlanForm
            value={planPrompt}
            onChange={setPlanPrompt}
            onSubmit={submitPlan}
          />
        )}

        {activeTab === 'stays' && (
          <StaysForm
            islandSlug={staysIsland}
            onIslandChange={setStaysIsland}
            checkIn={checkIn}
            onCheckInChange={(v) => {
              setCheckIn(v)
              if (checkOut && v && v >= checkOut) {
                setCheckOut(toIsoDate(addDays(new Date(v + 'T00:00:00'), 4)))
              }
            }}
            checkOut={checkOut}
            onCheckOutChange={setCheckOut}
            travelers={staysTravelers}
            onTravelersChange={setStaysTravelers}
            minDate={todayIso}
            onSubmit={submitStays}
            chatFallbackPrompt={planFromCurrent()}
          />
        )}

        {activeTab === 'flights' && (
          <FlightsForm
            tripType={flightTripType}
            onTripTypeChange={setFlightTripType}
            origin={flightOrigin}
            onOriginChange={setFlightOrigin}
            destination={flightDestination}
            onDestinationChange={setFlightDestination}
            depart={flightDepart}
            onDepartChange={(v) => {
              setFlightDepart(v)
              if (flightReturn && v && v > flightReturn) {
                setFlightReturn(toIsoDate(addDays(new Date(v + 'T00:00:00'), 5)))
              }
            }}
            returnDate={flightReturn}
            onReturnChange={setFlightReturn}
            travelers={flightTravelers}
            onTravelersChange={setFlightTravelers}
            cabin={flightCabin}
            onCabinChange={setFlightCabin}
            minDate={todayIso}
            onSubmit={submitFlights}
            chatFallbackPrompt={planFromCurrent()}
          />
        )}

        {activeTab === 'things' && (
          <ThingsForm
            islandSlug={thingsIsland}
            onIslandChange={setThingsIsland}
            date={thingsDate}
            onDateChange={setThingsDate}
            travelers={thingsTravelers}
            onTravelersChange={setThingsTravelers}
            vibes={thingsVibes}
            onVibesChange={setThingsVibes}
            minDate={todayIso}
            onSubmit={submitThings}
          />
        )}
      </div>
    </section>
  )
}

// ─── Plan a Trip form ────────────────────────────────────────────────────────

interface PlanFormProps {
  value: string
  onChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
}

function PlanForm({ value, onChange, onSubmit }: PlanFormProps) {
  return (
    <form onSubmit={onSubmit} aria-label="Plan a trip with Buddy" className="space-y-4">
      <div>
        <label htmlFor="plan-prompt" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
          Tell Buddy what you&rsquo;re thinking
        </label>
        <textarea
          id="plan-prompt"
          name="plan-prompt"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="A vibe, a dream, a rough idea... e.g. honeymoon in Exuma in May, or family trip with two kids."
          className="w-full rounded-baha-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-night placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
        />
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500">
          Buddy plans flights, hotels, activities, and the day-by-day for you.
        </p>
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-full transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        >
          Start with Buddy
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>
    </form>
  )
}

// ─── Stays form ──────────────────────────────────────────────────────────────

interface StaysFormProps {
  islandSlug: string
  onIslandChange: (slug: string) => void
  checkIn: string
  onCheckInChange: (v: string) => void
  checkOut: string
  onCheckOutChange: (v: string) => void
  travelers: TravelersValue
  onTravelersChange: (v: TravelersValue) => void
  minDate: string
  onSubmit: (e: FormEvent) => void
  chatFallbackPrompt: string
}

function StaysForm(p: StaysFormProps) {
  return (
    <form onSubmit={p.onSubmit} aria-label="Search hotels" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <IslandSelect
          id="stays-island"
          label="Where to"
          value={p.islandSlug}
          onChange={p.onIslandChange}
        />
        <BahaDatePicker
          id="stays-checkin"
          name="stays-checkin"
          label="Check-in"
          minDate={p.minDate}
          value={p.checkIn}
          onChange={p.onCheckInChange}
          placeholder="Pick a date"
        />
        <BahaDatePicker
          id="stays-checkout"
          name="stays-checkout"
          label="Check-out"
          minDate={p.checkIn || p.minDate}
          value={p.checkOut}
          onChange={p.onCheckOutChange}
          placeholder="Pick a date"
        />
        <TravelersPopover
          mode="stays"
          triggerLabel="Travelers"
          value={p.travelers}
          onChange={p.onTravelersChange}
        />
      </div>
      <SubmitRow chatFallbackPrompt={p.chatFallbackPrompt} cta="Find stays" />
    </form>
  )
}

// ─── Flights form ────────────────────────────────────────────────────────────

interface FlightsFormProps {
  tripType: 'round_trip' | 'one_way'
  onTripTypeChange: (v: 'round_trip' | 'one_way') => void
  origin: string
  onOriginChange: (v: string) => void
  destination: string
  onDestinationChange: (v: string) => void
  depart: string
  onDepartChange: (v: string) => void
  returnDate: string
  onReturnChange: (v: string) => void
  travelers: TravelersValue
  onTravelersChange: (v: TravelersValue) => void
  cabin: string
  onCabinChange: (v: string) => void
  minDate: string
  onSubmit: (e: FormEvent) => void
  chatFallbackPrompt: string
}

function FlightsForm(p: FlightsFormProps) {
  return (
    <form onSubmit={p.onSubmit} aria-label="Search flights" className="space-y-4">
      <div role="radiogroup" aria-label="Trip type" className="inline-flex bg-gray-100 rounded-full p-1 text-sm">
        <button
          type="button"
          role="radio"
          aria-checked={p.tripType === 'round_trip'}
          onClick={() => p.onTripTypeChange('round_trip')}
          className={`px-4 py-1.5 rounded-full font-medium transition-colors ${
            p.tripType === 'round_trip'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-gray-600 hover:text-night'
          }`}
        >
          Round-trip
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={p.tripType === 'one_way'}
          onClick={() => p.onTripTypeChange('one_way')}
          className={`px-4 py-1.5 rounded-full font-medium transition-colors ${
            p.tripType === 'one_way'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-gray-600 hover:text-night'
          }`}
        >
          One-way
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label htmlFor="flight-origin" className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            From
          </label>
          <input
            id="flight-origin"
            name="flight-origin"
            type="text"
            required
            autoComplete="off"
            list="hero-origin-options"
            value={p.origin}
            onChange={e => p.onOriginChange(e.target.value)}
            placeholder="City or airport"
            className="w-full h-[46px] rounded-baha-md border border-gray-300 bg-white px-3 text-sm text-night placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <datalist id="hero-origin-options">
            {ORIGIN_SUGGESTIONS.map(o => (
              <option key={o.label} value={o.value} label={o.label} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="flight-dest" className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            To
          </label>
          <select
            id="flight-dest"
            name="flight-dest"
            value={p.destination}
            onChange={e => p.onDestinationChange(e.target.value)}
            className="w-full h-[46px] rounded-baha-md border border-gray-300 bg-white px-3 text-sm text-night focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {FLIGHT_DESTINATIONS.map(d => (
              <option key={d.code} value={d.code}>{d.label}</option>
            ))}
          </select>
        </div>

        <BahaDatePicker
          id="flight-depart"
          name="flight-depart"
          label="Departure"
          required
          minDate={p.minDate}
          value={p.depart}
          onChange={p.onDepartChange}
          placeholder="Departure"
        />

        {p.tripType === 'round_trip' ? (
          <BahaDatePicker
            id="flight-return"
            name="flight-return"
            label="Return"
            required
            minDate={p.depart || p.minDate}
            value={p.returnDate}
            onChange={p.onReturnChange}
            placeholder="Return"
          />
        ) : (
          <div className="hidden lg:block" aria-hidden="true" />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TravelersPopover
          mode="flights"
          triggerLabel="Travelers"
          value={p.travelers}
          onChange={p.onTravelersChange}
        />
        <div>
          <label htmlFor="flight-cabin" className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Cabin
          </label>
          <select
            id="flight-cabin"
            name="flight-cabin"
            value={p.cabin}
            onChange={e => p.onCabinChange(e.target.value)}
            className="w-full h-[46px] rounded-baha-md border border-gray-300 bg-white px-3 text-sm text-night focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="economy">Economy</option>
            <option value="premium_economy">Premium Economy</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>
        </div>
      </div>

      <SubmitRow chatFallbackPrompt={p.chatFallbackPrompt} cta="Find flights" />
    </form>
  )
}

// ─── Things to Do form ───────────────────────────────────────────────────────

interface ThingsFormProps {
  islandSlug: string
  onIslandChange: (slug: string) => void
  date: string
  onDateChange: (v: string) => void
  travelers: TravelersValue
  onTravelersChange: (v: TravelersValue) => void
  vibes: Set<string>
  onVibesChange: (s: Set<string>) => void
  minDate: string
  onSubmit: (e: FormEvent) => void
}

function ThingsForm(p: ThingsFormProps) {
  function toggleVibe(key: string) {
    const next = new Set(p.vibes)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    p.onVibesChange(next)
  }

  return (
    <form onSubmit={p.onSubmit} aria-label="Find things to do" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <IslandSelect
          id="things-island"
          label="Where"
          value={p.islandSlug}
          onChange={p.onIslandChange}
        />
        <BahaDatePicker
          id="things-date"
          name="things-date"
          label="When"
          minDate={p.minDate}
          value={p.date}
          onChange={p.onDateChange}
          placeholder="Any date"
        />
        <TravelersPopover
          mode="things"
          triggerLabel="Travelers"
          value={p.travelers}
          onChange={p.onTravelersChange}
        />
      </div>

      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Optional &mdash; what are you into?
        </p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_VIBES.map(v => {
            const active = p.vibes.has(v.key)
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => toggleVibe(v.key)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  active
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-brand-300 hover:text-brand-700'
                }`}
              >
                {v.label}
              </button>
            )
          })}
        </div>
      </div>

      <SubmitRow cta="Find activities" />
    </form>
  )
}

// ─── Shared subcomponents ────────────────────────────────────────────────────

interface IslandSelectProps {
  id: string
  label: string
  value: string
  onChange: (slug: string) => void
}

function IslandSelect({ id, label, value, onChange }: IslandSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-[46px] rounded-baha-md border border-gray-300 bg-white px-3 text-sm text-night focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      >
        {ISLANDS.map(i => (
          <option key={i.slug} value={i.slug}>{i.label}</option>
        ))}
      </select>
    </div>
  )
}

interface SubmitRowProps {
  cta: string
  /** When provided, renders an "Or chat with Buddy" secondary link. */
  chatFallbackPrompt?: string
}

function SubmitRow({ cta, chatFallbackPrompt }: SubmitRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
      {chatFallbackPrompt ? (
        <Link
          href={`/dashboard/chat?q=${encodeURIComponent(chatFallbackPrompt)}`}
          className="text-sm text-brand-600 hover:text-brand-700 underline-offset-2 hover:underline font-medium"
        >
          Or chat with Buddy about it
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      <button
        type="submit"
        className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-full transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
      >
        {cta}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </button>
    </div>
  )
}
