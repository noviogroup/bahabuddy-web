'use client'

/**
 * MarketingHeroSearch — direct-intent search panel for the public landing hero.
 *
 * Marketing-site equivalent of the dashboard's `HeroSearchPanel`. Same
 * four-category model (Plan a Trip / Stays / Flights / Things to Do),
 * but adapted for an unauthenticated visitor on a photo-backdrop hero:
 *
 *   • Translucent glass styling instead of white card, so it sits
 *     gracefully over the rotating island hero photos.
 *
 *   • The "Plan a Trip" tab is the existing brand moment — chat input,
 *     rotating placeholder, suggestion chips — preserved verbatim from
 *     HeroSection.tsx. We don't want to lose the conversational hook
 *     that's already converting.
 *
 *   • The other three tabs use simplified forms (Where + Travelers
 *     only — no date pickers, no rooms picker). Marketing-funnel
 *     visitors haven't committed yet; lower friction = better
 *     conversion. Dates default to "today + 14" server-side so the
 *     resulting /hotels or /flights search lands somewhere reasonable
 *     that the user can tweak after signing in.
 *
 * Routing for unauthenticated visitors:
 *   - Plan a Trip   → /dashboard?q=…   (middleware preserves ?q= through /login)
 *   - Stays         → /stays?island=…
 *   - Flights       → /flights?origin=…&destination=…
 *   - Things to Do  → /dashboard/chat?q=…
 */

import { useEffect, useState, useCallback, type ReactNode, type FormEvent } from 'react'

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

const FLIGHT_DESTINATIONS: readonly { code: string; label: string }[] = [
  { code: 'NAS', label: 'Nassau (NAS)' },
  { code: 'EXU', label: 'Exuma (EXU)' },
  { code: 'ELH', label: 'North Eleuthera (ELH)' },
  { code: 'GHB', label: 'Governor\u2019s Harbour (GHB)' },
  { code: 'FPO', label: 'Freeport (FPO)' },
  { code: 'BIM', label: 'Bimini (BIM)' },
  { code: 'ASD', label: 'Andros (ASD)' },
  { code: 'MHH', label: 'Marsh Harbour (MHH)' },
]

const ORIGIN_SUGGESTIONS: readonly string[] = [
  'Miami', 'Fort Lauderdale', 'New York', 'Newark', 'Atlanta',
  'Charlotte', 'Dallas', 'Houston', 'Chicago', 'Los Angeles',
  'Boston', 'Orlando', 'Toronto', 'London',
]

const ACTIVITY_VIBES: readonly { key: string; label: string }[] = [
  { key: 'beach',     label: 'Beach & Chill' },
  { key: 'adventure', label: 'Adventure' },
  { key: 'family',    label: 'Family Fun' },
  { key: 'foodie',    label: 'Foodie' },
  { key: 'water',     label: 'Water Sports' },
  { key: 'romance',   label: 'Romance' },
]

// ─── Chat-tab (Plan a Trip) brand assets ─────────────────────────────────────
// Verbatim port from HeroSection.tsx so the conversational lane retains
// its existing copy + animation. Keep these in sync if marketing updates
// the hero microcopy.

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

function isoDateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MarketingHeroSearch() {
  const [activeTab, setActiveTab] = useState<TabKey>('plan')

  // ── Plan a Trip state (chat input + chips) ──
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
    window.location.href = `/dashboard?q=${encodeURIComponent(query.trim())}`
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
    const islandLabel = ISLANDS.find(i => i.slug === thingsIsland)?.label ?? 'the Bahamas'
    const parts: string[] = [`Show me things to do in ${islandLabel}`]
    if (thingsVibes.size > 0) {
      const vibeLabels = ACTIVITY_VIBES
        .filter(v => thingsVibes.has(v.key))
        .map(v => v.label.toLowerCase())
        .join(', ')
      parts.push(`\u2014 I\u2019m into ${vibeLabels}`)
    }
    const q = parts.join(' ') + '.'
    window.location.href = `/dashboard/chat?q=${encodeURIComponent(q)}`
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
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-black/30 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Tab strip */}
        <div role="tablist" aria-label="Search category" className="flex items-stretch gap-0 overflow-x-auto border-b border-white">
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={`group relative flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? 'text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                <span
                  className={`flex items-center justify-center transition-colors ${
                    active ? 'text-gold-300' : 'text-white/60 group-hover:text-white/85'
                  }`}
                >
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-3 right-3 -bottom-px h-0.5 bg-gold-300 rounded-full"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Form area */}
        <div className="p-3 sm:p-4">
          {activeTab === 'plan' && (
            <form onSubmit={submitPlan} aria-label="Plan a trip with Baha Buddy">
              <div className="flex gap-2 bg-black/25 border border-white/25 rounded-xl p-1.5">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Ask Baha Buddy about your Bahamas trip"
                    className="relative z-10 w-full bg-transparent text-white px-3 py-3 text-base outline-none min-w-0"
                  />
                  {!query && (
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute left-3 right-3 top-1/2 z-0 -translate-y-1/2 truncate text-left text-base text-white/60 transition-opacity duration-300 ease-in-out ${
                        placeholderVisible ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {ROTATING_PLACEHOLDERS[placeholderIndex]}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className="bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white rounded-lg px-4 py-2.5 font-semibold text-sm transition-colors flex items-center gap-2 flex-shrink-0 shadow-lg"
                >
                  Plan my trip
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
                <DarkSelect
                  id="m-stays-island"
                  label="Where to"
                  value={staysIsland}
                  onChange={setStaysIsland}
                  options={ISLANDS.map(i => ({ value: i.slug, label: i.label }))}
                />
                <DarkSelect
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
                <DarkTextInput
                  id="m-flight-from"
                  label="From"
                  value={flightOrigin}
                  onChange={setFlightOrigin}
                  listId="m-flight-from-list"
                  placeholder="City"
                />
                <datalist id="m-flight-from-list">
                  {ORIGIN_SUGGESTIONS.map(o => <option key={o} value={o} />)}
                </datalist>
                <DarkSelect
                  id="m-flight-to"
                  label="To"
                  value={flightDestination}
                  onChange={setFlightDestination}
                  options={FLIGHT_DESTINATIONS.map(d => ({ value: d.code, label: d.label }))}
                />
                <DarkSelect
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
              <DarkSelect
                id="m-things-island"
                label="Where"
                value={thingsIsland}
                onChange={setThingsIsland}
                options={ISLANDS.map(i => ({ value: i.slug, label: i.label }))}
              />
              <div>
                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide mb-1.5">
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
                            : 'bg-black/25 border-white/30 text-white hover:bg-black/40 hover:border-white/50'
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
        <div className="w-full max-w-3xl mx-auto overflow-x-auto pt-4 pb-1 -mx-4 px-4">
          <div className="flex gap-2 flex-wrap justify-center">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChip(chip.prompt)}
                className="bg-black/25 hover:bg-black/40 active:bg-black/40 backdrop-blur-md border border-white/25 text-white text-sm rounded-full px-4 py-2 transition-all shadow-sm whitespace-nowrap"
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

interface DarkSelectProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly { value: string; label: string }[]
}

function DarkSelect({ id, label, value, onChange, options }: DarkSelectProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[10px] font-semibold text-white/60 uppercase tracking-wide mb-1">
        {label}
      </span>
      <div className="relative">
        <select
          id={id}
          name={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full h-11 appearance-none bg-black/25 border border-white/30 rounded-lg pl-3 pr-9 text-sm text-white focus:border-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-300/30 transition-colors"
        >
          {options.map(o => (
            <option key={o.value} value={o.value} className="bg-night text-white">
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </label>
  )
}

interface DarkTextInputProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  listId?: string
}

function DarkTextInput({ id, label, value, onChange, placeholder, listId }: DarkTextInputProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[10px] font-semibold text-white/60 uppercase tracking-wide mb-1">
        {label}
      </span>
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
        className="w-full h-11 bg-black/25 border border-white/30 rounded-lg px-3 text-sm text-white placeholder:text-white/40 focus:border-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-300/30 transition-colors"
      />
    </label>
  )
}

function SubmitBar({ cta }: { cta: string }) {
  return (
    <div className="flex justify-end pt-1">
      <button
        type="submit"
        className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg shadow-lg transition-colors"
      >
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
