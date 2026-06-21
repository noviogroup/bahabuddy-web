'use client'

/**
 * MarketingHeroSearch — direct-intent search panel for the public landing hero.
 *
 * Marketing-site equivalent of the dashboard's `HeroSearchPanel`. Same
 * four-category model (Plan a Trip / Stays / Flights / Things to Do),
 * but adapted for an unauthenticated visitor on the public homepage hero:
 *
 *   • A white marketplace card over the rotating island hero photos,
 *     matching the compact public booking surfaces used on inner pages.
 *
 *   • The "Plan a Trip" tab keeps the existing Buddy-style prompt input,
 *     rotating placeholder, and suggestion chips, but routes into direct
 *     trip creation instead of sending the visitor back to chat.
 *
 *   • The other three tabs use simplified forms (Where + Travelers
 *     only — no date pickers, no rooms picker). Marketing-funnel
 *     visitors haven't committed yet; lower friction = better
 *     conversion. Dates default to "today + 14" server-side so the
 *     resulting /stays or /flights search lands somewhere reasonable
 *     that the user can tweak after signing in.
 *
 * Routing for unauthenticated visitors:
 *   - Plan a Trip   → /dashboard/trips/new?source=marketing_hero&seed=…
 *   - Stays         → /stays?island=…
 *   - Flights       → /flights?origin=…&destination=…
 *   - Things to Do  → /explore/places?…
 */

import { useEffect, useRef, useState, useCallback, type ReactNode, type FormEvent, type KeyboardEvent } from 'react'
import TravelSearchCombobox from '@/components/marketplace/TravelSearchCombobox'
import { BAHAMAS_AIRPORT_OPTIONS, ORIGIN_AIRPORT_OPTIONS } from '@/lib/airports'
import { buildExplorePlacesHref } from '@/lib/explore-routing'
import {
  readStoredTravelOrigin,
  TRAVEL_ORIGIN_EVENT,
  type TravelOriginEventDetail,
} from '@/lib/travel-origin'

// ─── Reference data — kept in sync with dashboard HeroSearchPanel ─────────────

interface Island {
  slug: string
  label: string
}

const ISLANDS: readonly Island[] = [
  { slug: 'nassau',          label: 'Nassau' },
  { slug: 'paradise-island', label: 'Paradise Island' },
  { slug: 'exuma',           label: 'Exuma' },
  { slug: 'eleuthera',       label: 'Eleuthera' },
  { slug: 'harbour-island',  label: 'Harbour Island' },
  { slug: 'andros',          label: 'Andros' },
  { slug: 'grand-bahama',    label: 'Grand Bahama' },
  { slug: 'bimini',          label: 'Bimini' },
  { slug: 'long-island',     label: 'Long Island' },
  { slug: 'abacos',          label: 'The Abacos' },
]

const ACTIVITY_VIBES: readonly { key: string; label: string }[] = [
  { key: 'beach',     label: 'Beach & Chill' },
  { key: 'adventure', label: 'Adventure' },
  { key: 'family',    label: 'Family Fun' },
  { key: 'foodie',    label: 'Foodie' },
  { key: 'water',     label: 'Water Sports' },
  { key: 'romance',   label: 'Romance' },
]

// ─── Plan-tab brand assets ──────────────────────────────────────────────────
// Conversational prompt examples that seed the direct trip-creation flow.
// Keep these in sync if marketing updates the hero microcopy.

const ROTATING_PLACEHOLDERS = [
  'Plan a trip to see the swimming pigs in Exuma…',
  'Best snorkeling spots in Nassau…',
  'Plan an Exuma Cays day trip itinerary…',
  'Best nightlife spots in Nassau…',
  'Plan a family beach vacation in the Bahamas…',
  'Romantic things to do in Harbour Island…',
  'Visit Seven Mile Beach in Andros…',
  'Best local seafood and food tours…',
] as const

const QUICK_CHIPS: readonly { label: string; prompt: string }[] = [
  { label: 'Swimming Pigs (Exuma)',     prompt: 'Plan a trip to see the swimming pigs in Exuma' },
  { label: 'Snorkeling in Nassau',      prompt: 'Best snorkeling spots in Nassau Bahamas' },
  { label: 'Exuma Cays day trip',       prompt: 'Plan an Exuma Cays day trip itinerary' },
  { label: 'Nassau nightlife',          prompt: 'Best nightlife spots in Nassau Bahamas' },
  { label: 'Family beach holiday',      prompt: 'Plan a family beach vacation in the Bahamas' },
  { label: 'Romantic Harbour Island',   prompt: 'Romantic things to do in Harbour Island Bahamas' },
  { label: 'Seven Mile Beach, Andros',  prompt: 'Plan a visit to Seven Mile Beach in Andros Bahamas' },
  { label: 'Local seafood tour',        prompt: 'Best local seafood restaurants and food tours in the Bahamas' },
]

const PLACEHOLDER_MS = 2000
const PLACEHOLDER_FADE_MS = 400

// ─── Tab definitions ─────────────────────────────────────────────────────────

type TabKey = 'plan' | 'stays' | 'flights' | 'things'

interface Tab {
  key: TabKey
  label: string
  icon: ReactNode
}

const ICON_SPARKLE = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </svg>
)

const ICON_BED = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-7a2 2 0 012-2h14a2 2 0 012 2v7M3 14h18M7 11V8a1 1 0 011-1h3a1 1 0 011 1v3" />
  </svg>
)

const ICON_FLIGHT = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16l7-3v-5a2 2 0 014 0v5l7 3v2l-7-2v3l2 1.5V20l-4-1-4 1v-1.5L10 17v-3l-7 2v-2z" />
  </svg>
)

const ICON_TICKET = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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

export function marketingHeroTripHref(seed: string): string {
  const clean = seed.replace(/\s+/g, ' ').trim()
  const params = new URLSearchParams()
  params.set('source', 'marketing_hero')
  params.set('returnTo', '/')
  if (clean) params.set('seed', clean)
  return `/dashboard/trips/new?${params.toString()}`
}

function isoDateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MarketingHeroSearch() {
  const [activeTab, setActiveTab] = useState<TabKey>('plan')

  // ── Plan a Trip state (prompt input + chips) ──
  const [query, setQuery] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [placeholderVisible, setPlaceholderVisible] = useState(true)

  // ── Stays state ──
  const [staysIsland, setStaysIsland] = useState<string>('nassau')
  const [staysTravelers, setStaysTravelers] = useState<number>(2)

  // ── Flights state ──
  const [flightOrigin, setFlightOrigin] = useState<string>('Miami')
  const [flightDestination, setFlightDestination] = useState<string>('NAS')
  const [flightTravelers, setFlightTravelers] = useState<number>(2)

  // ── Things to Do state ──
  const [thingsIsland, setThingsIsland] = useState<string>('nassau')
  const [thingsVibes, setThingsVibes] = useState<Set<string>>(new Set())

  useEffect(() => {
    const storedOrigin = readStoredTravelOrigin()?.origin
    if (storedOrigin) setFlightOrigin(storedOrigin)

    function handleOriginUpdated(event: Event) {
      const nextOrigin = (event as CustomEvent<TravelOriginEventDetail>).detail?.origin?.trim()
      if (nextOrigin) setFlightOrigin(nextOrigin)
    }

    window.addEventListener(TRAVEL_ORIGIN_EVENT, handleOriginUpdated)
    return () => window.removeEventListener(TRAVEL_ORIGIN_EVENT, handleOriginUpdated)
  }, [])

  // Rotating placeholder on the Plan tab when no query typed.
  useEffect(() => {
    if (activeTab !== 'plan') return
    if (query.trim()) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    let fadeTimeoutId: number | undefined
    const intervalId = window.setInterval(() => {
      setPlaceholderVisible(false)
      fadeTimeoutId = window.setTimeout(() => {
        setPlaceholderIndex((i) => (i + 1) % ROTATING_PLACEHOLDERS.length)
        setPlaceholderVisible(true)
      }, PLACEHOLDER_FADE_MS)
    }, PLACEHOLDER_MS)

    return () => {
      window.clearInterval(intervalId)
      if (fadeTimeoutId !== undefined) window.clearTimeout(fadeTimeoutId)
    }
  }, [activeTab, query])

  // ── Submit handlers ────────────────────────────────────────────────────────

  function submitPlan(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    window.location.href = marketingHeroTripHref(query)
  }

  const handleChip = useCallback((prompt: string) => {
    setQuery(prompt)
    setPlaceholderVisible(true)
  }, [])

  function submitStays(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('island', staysIsland)
    params.set('checkIn', isoDateOffset(14))
    params.set('checkOut', isoDateOffset(18))
    params.set('adults', String(staysTravelers))
    params.set('children', '0')
    params.set('rooms', '1')
    window.location.href = `/stays?${params.toString()}`
  }

  function submitFlights(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('origin', flightOrigin)
    params.set('destination', flightDestination)
    params.set('depart', isoDateOffset(14))
    params.set('return', isoDateOffset(19))
    params.set('tripType', 'round_trip')
    params.set('passengers', String(flightTravelers))
    params.set('cabin', 'economy')
    window.location.href = `/flights?${params.toString()}`
  }

  function submitThings(e: FormEvent) {
    e.preventDefault()
    window.location.href = buildExplorePlacesHref({
      islandSlug: thingsIsland,
      vibes: thingsVibes,
      search: thingsVibes.size > 0 ? undefined : 'things to do',
    })
  }

  function toggleVibe(key: string) {
    setThingsVibes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-2xl shadow-brand-950/25">
        {/* Tab strip */}
        <div role="tablist" aria-label="Search category" className="flex items-stretch gap-0 overflow-x-auto border-b border-gray-200 bg-white">
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={`group relative flex items-center gap-2 px-4 py-4 text-sm font-extrabold whitespace-nowrap transition-colors sm:px-5 ${
                  active ? 'text-brand-700' : 'text-gray-500 hover:text-night'
                }`}
              >
                <span
                  className={`flex items-center justify-center transition-colors ${
                    active ? 'text-gold-500' : 'text-gray-400 group-hover:text-brand-700'
                  }`}
                >
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-gold-400"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Form area */}
        <div className="bg-offwhite p-3 sm:p-4">
          {activeTab === 'plan' && (
            <form onSubmit={submitPlan} aria-label="Create a trip with Baha Buddy">
              <div className="flex gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-input">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Tell Baha Buddy what kind of Bahamas trip you want"
                    className="relative z-10 min-w-0 w-full bg-transparent px-3 py-3 text-base font-bold text-night outline-none"
                  />
                  {!query && (
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute left-3 right-3 top-1/2 z-0 -translate-y-1/2 truncate text-left text-base font-semibold text-gray-400 transition-opacity duration-300 ease-in-out ${
                        placeholderVisible ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {ROTATING_PLACEHOLDERS[placeholderIndex]}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-card transition-colors hover:bg-brand-700 active:bg-brand-700"
                >
                  <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                  Start trip
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'stays' && (
            <form onSubmit={submitStays} aria-label="Search hotels" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <HeroSearchSelect
                  id="m-stays-island"
                  label="Where to"
                  value={staysIsland}
                  onChange={setStaysIsland}
                  options={ISLANDS.map(i => ({ value: i.slug, label: i.label }))}
                />
                <HeroSearchSelect
                  id="m-stays-travelers"
                  label="Travelers"
                  value={String(staysTravelers)}
                  onChange={(v) => setStaysTravelers(Number(v))}
                  options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
                    value: String(n),
                    label: `${n} ${n === 1 ? 'traveler' : 'travelers'}`,
                  }))}
                />
              </div>
              <SubmitBar cta="Find stays" />
            </form>
          )}

          {activeTab === 'flights' && (
            <form onSubmit={submitFlights} aria-label="Search flights" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <HeroSearchComboboxField label="From" htmlFor="m-flight-from">
                  <TravelSearchCombobox
                    id="m-flight-from"
                    name="m-flight-from"
                    value={flightOrigin}
                    onChange={setFlightOrigin}
                    options={ORIGIN_AIRPORT_OPTIONS}
                    ariaLabel="From"
                    allowCustomValue
                    placeholder="City or airport"
                    emptyLabel="Type a city, airport, or 3-letter code"
                    helperText="Try Miami, West Palm Beach, JFK, Atlanta, Toronto"
                    customOptionLabel={(nextQuery) => `Use "${nextQuery}" as departure city`}
                  />
                </HeroSearchComboboxField>
                <HeroSearchComboboxField label="To" htmlFor="m-flight-to">
                  <TravelSearchCombobox
                    id="m-flight-to"
                    name="m-flight-to"
                    value={flightDestination}
                    onChange={setFlightDestination}
                    options={BAHAMAS_AIRPORT_OPTIONS}
                    ariaLabel="To"
                    placeholder="Island or airport"
                    emptyLabel="Choose a Bahamas airport"
                    helperText="Search Nassau, Exuma, Eleuthera, Abaco, Bimini, or code"
                  />
                </HeroSearchComboboxField>
                <HeroSearchSelect
                  id="m-flight-travelers"
                  label="Travelers"
                  value={String(flightTravelers)}
                  onChange={(v) => setFlightTravelers(Number(v))}
                  options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
                    value: String(n),
                    label: `${n} ${n === 1 ? 'traveler' : 'travelers'}`,
                  }))}
                />
              </div>
              <SubmitBar cta="Find flights" />
            </form>
          )}

          {activeTab === 'things' && (
            <form onSubmit={submitThings} aria-label="Find things to do" className="space-y-3">
              <HeroSearchSelect
                id="m-things-island"
                label="Where"
                value={thingsIsland}
                onChange={setThingsIsland}
                options={ISLANDS.map(i => ({ value: i.slug, label: i.label }))}
              />
              <div>
                <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-gray-500">
                  Optional &mdash; what&rsquo;s your vibe?
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVITY_VIBES.map(v => {
                    const active = thingsVibes.has(v.key)
                    return (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => toggleVibe(v.key)}
                        aria-pressed={active}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                          active
                            ? 'bg-gold-400 border-gold-400 text-night'
                            : 'border-gray-200 bg-white text-charcoal hover:border-brand-200 hover:bg-brand-50'
                        }`}
                      >
                        {v.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <SubmitBar cta="Find activities" />
            </form>
          )}
        </div>
      </div>

      {/* Suggestion chips — only on Plan a Trip tab. Sits outside the
          panel so the chip row keeps its own breathing room and matches
          the pre-existing hero layout. */}
      {activeTab === 'plan' && (
        <div className="-mx-4 w-full max-w-3xl overflow-x-auto px-4 pb-1 pt-4">
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChip(chip.prompt)}
                className="whitespace-nowrap rounded-full border border-white/75 bg-white/90 px-4 py-2 text-sm font-extrabold text-brand-700 shadow-soft backdrop-blur-md transition-all hover:border-gold-300 hover:bg-gold-50 active:bg-gold-50"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Internal field components ──────────────────────────────────────────────

interface HeroSearchSelectProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly { value: string; label: string }[]
}

function HeroSearchSelect({ id, label, value, onChange, options }: HeroSearchSelectProps) {
  const rootRef = useRef<HTMLLabelElement>(null)
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const selectedOption = options.find((option) => option.value === value) ?? options[0]
  const activeOption = options[activeIndex] ?? selectedOption
  const listboxId = `${id}-listbox`

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    setActiveIndex(selectedIndex)
  }, [selectedIndex])

  function chooseOption(nextValue: string) {
    onChange(nextValue)
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => Math.min(current + 1, options.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(Math.max(0, options.length - 1))
      return
    }

    if ((event.key === 'Enter' || event.key === ' ') && open && activeOption) {
      event.preventDefault()
      chooseOption(activeOption.value)
      return
    }

    if ((event.key === 'Enter' || event.key === ' ') && !open) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(selectedIndex)
      return
    }

    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <label ref={rootRef} htmlFor={id} className="block">
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </span>
      <div className="relative">
        <select
          id={id}
          name={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          aria-label={`Open ${label} menu`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => {
            setOpen((current) => !current)
            setActiveIndex(selectedIndex)
          }}
          onKeyDown={handleKeyDown}
          className={`flex h-12 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm font-extrabold text-night shadow-input transition-colors focus:outline-none focus:ring-4 focus:ring-brand-100 ${
            open
              ? 'border-brand-500 bg-white'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <span className="min-w-0 truncate">{selectedOption?.label ?? 'Select'}</span>
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-brand-700 shadow-sm" aria-hidden="true">
            <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>

        {open && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute left-0 z-50 mt-2 min-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 shadow-2xl shadow-gray-950/10 ring-1 ring-black/5"
          >
            {options.map((option, index) => {
              const active = index === activeIndex
              const selected = option.value === value
              return (
                <button
                  key={option.value}
                  id={`${listboxId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    chooseOption(option.value)
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-extrabold transition-colors ${
                    active ? 'bg-brand-50 text-night' : 'text-charcoal hover:bg-gray-50 hover:text-night'
                  }`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {selected && (
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-400 text-night" aria-hidden="true">
                      <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                        <path d="m3.5 8.2 2.8 2.8 6.2-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </label>
  )
}

interface HeroSearchComboboxFieldProps {
  label: string
  htmlFor: string
  children: ReactNode
}

function HeroSearchComboboxField({ label, htmlFor, children }: HeroSearchComboboxFieldProps) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </span>
      {children}
    </label>
  )
}

function SubmitBar({ cta }: { cta: string }) {
  return (
    <div className="flex justify-end pt-1">
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-extrabold text-white shadow-card transition-colors hover:bg-brand-700 active:bg-brand-700"
      >
        <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
        {cta}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  )
}

// Re-export the chip data and rotating-placeholder constants so anyone
// migrating analytics or rewriting copy can find them in one place. The
// component itself uses the in-file constants \u2014 these exports are for
// convenience only.
export { QUICK_CHIPS, ROTATING_PLACEHOLDERS }
