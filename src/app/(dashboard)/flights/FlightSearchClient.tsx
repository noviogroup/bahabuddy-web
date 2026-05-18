'use client'

/**
 * FlightSearchClient — direct-search form + results for /flights.
 *
 * State machine:
 *   idle    → user hasn't searched yet; show empty hint
 *   loading → request in flight; show skeleton
 *   results → success path; show cards or "no results found"
 *   error   → validation / API error; show banner, keep form usable
 *
 * Results are rendered through <RichCardRenderer> with the same flight
 * cards Buddy emits in chat. Flight cards are intentionally non-linking
 * — Duffel offer IDs expire (~30 min) and have no stable URL — but the
 * inline price/duration/stops give users enough to compare and decide.
 *
 * Defaults that reduce typing:
 *   - Departure date: today + 14 days (typical Bahamas trip lead time)
 *   - Destination: NAS (largest catchment)
 *   - Passengers: 1
 *   - Cabin: economy
 *
 * Defaults that match mobile's known origin cities (CITY_TO_IATA in
 * chat-tools.ts). The datalist surfaces them as autocomplete hints.
 */

import { useState, useMemo, type FormEvent } from 'react'
import { RichCardRenderer, type CardData } from '@/components/RichCards'
import { BahaDatePicker } from '@/components/ui'

// ─── Reference data ──────────────────────────────────────────────────────────

/** Mirror of the chat-tool's CITY_TO_IATA. Used as datalist suggestions
 *  on the origin field. Keep these in sync — the executor's
 *  resolveAirportCode() is the actual source of truth and accepts both
 *  city names and IATA codes. */
const ORIGIN_SUGGESTIONS: Array<{ label: string; value: string }> = [
  { label: 'Miami (MIA)',           value: 'Miami' },
  { label: 'Fort Lauderdale (FLL)', value: 'Fort Lauderdale' },
  { label: 'New York JFK (JFK)',    value: 'New York' },
  { label: 'Newark (EWR)',          value: 'Newark' },
  { label: 'LaGuardia (LGA)',       value: 'LaGuardia' },
  { label: 'Atlanta (ATL)',         value: 'Atlanta' },
  { label: 'Charlotte (CLT)',       value: 'Charlotte' },
  { label: 'Dallas (DFW)',          value: 'Dallas' },
  { label: 'Houston (IAH)',         value: 'Houston' },
  { label: 'Chicago (ORD)',         value: 'Chicago' },
  { label: 'Los Angeles (LAX)',     value: 'Los Angeles' },
  { label: 'San Francisco (SFO)',   value: 'San Francisco' },
  { label: 'Boston (BOS)',          value: 'Boston' },
  { label: 'Philadelphia (PHL)',    value: 'Philadelphia' },
  { label: 'Washington (IAD)',      value: 'Washington' },
  { label: 'Orlando (MCO)',         value: 'Orlando' },
  { label: 'Tampa (TPA)',           value: 'Tampa' },
  { label: 'Detroit (DTW)',         value: 'Detroit' },
  { label: 'Denver (DEN)',          value: 'Denver' },
  { label: 'Seattle (SEA)',         value: 'Seattle' },
  { label: 'Toronto (YYZ)',         value: 'Toronto' },
  { label: 'London (LHR)',          value: 'London' },
]

const BAHAMAS_DESTINATIONS: Array<{ code: string; label: string }> = [
  { code: 'NAS', label: 'Nassau (NAS)' },
  { code: 'EXU', label: 'Exuma (EXU)' },
  { code: 'ELH', label: 'North Eleuthera (ELH)' },
  { code: 'GHB', label: 'Governor\u2019s Harbour (GHB)' },
  { code: 'FPO', label: 'Freeport / Grand Bahama (FPO)' },
  { code: 'BIM', label: 'Bimini (BIM)' },
  { code: 'ASD', label: 'Andros (ASD)' },
  { code: 'MHH', label: 'Marsh Harbour / Abacos (MHH)' },
]

const CABIN_CLASSES: Array<{ value: string; label: string }> = [
  { value: 'economy',          label: 'Economy' },
  { value: 'premium_economy',  label: 'Premium Economy' },
  { value: 'business',         label: 'Business' },
  { value: 'first',            label: 'First' },
]

// ─── Component ───────────────────────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'results' | 'error'

export default function FlightSearchClient() {
  // Default departure: 14 days from today. Computed once via useMemo so it
  // doesn't shift while the user is typing.
  const defaultDeparture = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  }, [])
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  const [originCity, setOriginCity] = useState('Miami')
  const [destination, setDestination] = useState('NAS')
  const [departureDate, setDepartureDate] = useState(defaultDeparture)
  const [returnDate, setReturnDate] = useState('')
  const [tripType, setTripType] = useState<'round_trip' | 'one_way'>('round_trip')
  const [passengers, setPassengers] = useState(1)
  const [cabinClass, setCabinClass] = useState('economy')

  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [results, setResults] = useState<CardData[]>([])
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null)

  /** Default return date when user toggles to round-trip: departure + 5 days. */
  function ensureReturnDate(dep: string) {
    if (returnDate) return
    if (!dep) return
    const d = new Date(dep)
    d.setDate(d.getDate() + 5)
    setReturnDate(d.toISOString().split('T')[0])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage(null)
    setEmptyMessage(null)
    setResults([])

    if (!originCity.trim()) {
      setErrorMessage('Tell us where you\u2019re flying from.')
      setStatus('error')
      return
    }

    try {
      const body: Record<string, unknown> = {
        origin_city: originCity.trim(),
        destination,
        departure_date: departureDate,
        passengers,
        cabin_class: cabinClass,
      }
      if (tripType === 'round_trip' && returnDate) {
        body.return_date = returnDate
      }

      const res = await fetch('/api/flights/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await res.json()

      if (!res.ok) {
        setErrorMessage(payload?.error ?? 'Flight search failed.')
        setStatus('error')
        return
      }

      // Executor can return either { results, cards } or { error, results: [] }
      if (payload.error) {
        setErrorMessage(payload.error as string)
        setStatus('error')
        return
      }

      const cards = (payload.cards ?? []) as CardData[]
      if (cards.length === 0) {
        setEmptyMessage(
          (payload.message as string | undefined) ??
            'No flights found for those dates. Try different dates or another origin.',
        )
        setStatus('results')
        return
      }

      setResults(cards)
      setStatus('results')
    } catch (err) {
      console.error('[FlightSearchClient]', err)
      setErrorMessage('Could not reach the flight search service. Check your connection and try again.')
      setStatus('error')
    }
  }

  const isLoading = status === 'loading'

  return (
    <div className="space-y-6">
      {/* ─── Search form ──────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-baha-lg border border-gray-200 shadow-card p-5 space-y-4"
        aria-label="Flight search"
      >
        {/* Round-trip / one-way segmented control */}
        <div role="radiogroup" aria-label="Trip type" className="inline-flex bg-gray-100 rounded-full p-1 text-sm">
          <button
            type="button"
            role="radio"
            aria-checked={tripType === 'round_trip'}
            onClick={() => {
              setTripType('round_trip')
              ensureReturnDate(departureDate)
            }}
            className={`px-4 py-1.5 rounded-full font-medium transition-colors ${
              tripType === 'round_trip'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-gray-600 hover:text-night'
            }`}
          >
            Round-trip
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={tripType === 'one_way'}
            onClick={() => setTripType('one_way')}
            className={`px-4 py-1.5 rounded-full font-medium transition-colors ${
              tripType === 'one_way'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-gray-600 hover:text-night'
            }`}
          >
            One-way
          </button>
        </div>

        {/* Origin + destination — single row on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="origin" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              From
            </label>
            <input
              id="origin"
              name="origin"
              type="text"
              required
              autoComplete="off"
              list="origin-options"
              value={originCity}
              onChange={e => setOriginCity(e.target.value)}
              placeholder="City or airport (e.g. Miami)"
              className="w-full rounded-baha-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-night placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <datalist id="origin-options">
              {ORIGIN_SUGGESTIONS.map(o => (
                <option key={o.label} value={o.value} label={o.label} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="destination" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              To
            </label>
            <select
              id="destination"
              name="destination"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              className="w-full rounded-baha-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-night focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {BAHAMAS_DESTINATIONS.map(d => (
                <option key={d.code} value={d.code}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates — depart + return (return hidden on one-way) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BahaDatePicker
            id="departure-date"
            name="departure-date"
            label="Departure"
            required
            minDate={todayStr}
            value={departureDate}
            onChange={(v) => {
              setDepartureDate(v)
              if (returnDate && v > returnDate) {
                const d = new Date(v)
                d.setDate(d.getDate() + 5)
                setReturnDate(d.toISOString().split('T')[0])
              }
            }}
            placeholder="Departure date"
          />
          {tripType === 'round_trip' && (
            <BahaDatePicker
              id="return-date"
              name="return-date"
              label="Return"
              required
              minDate={departureDate || todayStr}
              value={returnDate}
              onChange={setReturnDate}
              placeholder="Return date"
            />
          )}
        </div>

        {/* Passengers + cabin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="passengers" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Travelers
            </label>
            <select
              id="passengers"
              name="passengers"
              value={passengers}
              onChange={e => setPassengers(Number(e.target.value))}
              className="w-full rounded-baha-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-night focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'traveler' : 'travelers'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cabin-class" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Cabin
            </label>
            <select
              id="cabin-class"
              name="cabin-class"
              value={cabinClass}
              onChange={e => setCabinClass(e.target.value)}
              className="w-full rounded-baha-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-night focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {CABIN_CLASSES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-full transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                </svg>
                Searching…
              </>
            ) : (
              <>
                Search flights
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ─── Error banner ─────────────────────────────────────────────── */}
      {status === 'error' && errorMessage && (
        <div
          role="alert"
          className="rounded-baha-md bg-coral-50 border border-coral-200 text-coral-800 px-4 py-3 text-sm"
        >
          {errorMessage}
        </div>
      )}

      {/* ─── Loading skeleton ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-3" aria-live="polite" aria-busy="true">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-gray-50 border border-gray-100 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* ─── Results ──────────────────────────────────────────────────── */}
      {status === 'results' && results.length > 0 && (
        <section aria-label="Flight results" className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-600 px-1">
            {results.length} {results.length === 1 ? 'option' : 'options'} found
          </h2>
          <div className="space-y-1">
            {results.map((card, idx) => (
              <RichCardRenderer key={idx} cardData={card} />
            ))}
          </div>
          <p className="text-xs text-gray-400 px-1 pt-2">
            Prices are live Duffel offers and may expire within ~30 minutes.{' '}
            To book a specific flight, share it with Buddy in the chat.
          </p>
        </section>
      )}

      {/* ─── Empty (after a search) ───────────────────────────────────── */}
      {status === 'results' && results.length === 0 && emptyMessage && (
        <div className="rounded-baha-lg bg-white border border-gray-200 p-8 text-center shadow-soft">
          <p className="text-2xl mb-2" aria-hidden="true">✈️</p>
          <p className="text-sm text-gray-700">{emptyMessage}</p>
        </div>
      )}

      {/* ─── Idle empty state ─────────────────────────────────────────── */}
      {status === 'idle' && (
        <div className="rounded-baha-lg bg-brand-50/40 border border-brand-100 p-6 text-center">
          <p className="text-2xl mb-2" aria-hidden="true">✈️</p>
          <p className="text-sm text-night font-medium">
            Pick your dates above and we’ll pull live prices.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Daily nonstops to Nassau from Miami, Fort Lauderdale, New York,
            Atlanta, and more.
          </p>
        </div>
      )}
    </div>
  )
}
