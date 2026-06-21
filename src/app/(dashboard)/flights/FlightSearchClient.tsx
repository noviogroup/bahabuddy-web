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
 * cards Buddy emits in chat. Cards now expose a direct "Book this fare"
 * action when the provider offer ID is present.
 *
 * Defaults that reduce typing:
 *   - Departure date: today + 14 days (typical Bahamas trip lead time)
 *   - Destination: NAS (largest catchment)
 *   - Passengers: 1
 *   - Cabin: economy
 *
 * Defaults that match mobile's known origin cities (CITY_TO_IATA in
 * chat-tools.ts). The airport combobox surfaces city, airport, and code
 * matches without requiring users to know IATA codes.
 */

import { useState, useMemo, useEffect, useRef, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { RichCardRenderer, type CardData } from '@/components/RichCards'
import { FilterButton } from '@/components/marketplace/ResultFilterPanel'
import { track } from '@/lib/analytics'
import {
  FLIGHT_RESULT_MODES,
  rankFlightResults,
  type FlightResultMode,
} from '@/lib/flight-result-filters'
import {
  readStoredTravelOrigin,
  TRAVEL_ORIGIN_EVENT,
  type TravelOriginEventDetail,
} from '@/lib/travel-origin'
import { BAHAMAS_AIRPORT_OPTIONS, ORIGIN_AIRPORT_OPTIONS } from '@/lib/airports'
import { BahaDatePicker } from '@/components/ui'
import {
  TravelSearchField,
  TravelSearchSelect,
} from '@/components/marketplace/TravelSearchFields'
import TravelSearchCombobox from '@/components/marketplace/TravelSearchCombobox'

// ─── Reference data ──────────────────────────────────────────────────────────

const POPULAR_ROUTES: Array<{ label: string; origin: string; destination: string }> = [
  { label: 'Miami to Nassau', origin: 'Miami', destination: 'NAS' },
  { label: 'Fort Lauderdale to Nassau', origin: 'Fort Lauderdale', destination: 'NAS' },
  { label: 'New York to Nassau', origin: 'New York', destination: 'NAS' },
  { label: 'Atlanta to Exuma', origin: 'Atlanta', destination: 'EXU' },
  { label: 'Charlotte to Eleuthera', origin: 'Charlotte', destination: 'ELH' },
]

const CABIN_CLASSES: Array<{ value: string; label: string }> = [
  { value: 'economy',          label: 'Economy' },
  { value: 'premium_economy',  label: 'Premium Economy' },
  { value: 'business',         label: 'Business' },
  { value: 'first',            label: 'First' },
]

// ─── Component ───────────────────────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'results' | 'error'

type FlightSearchArgs = {
  originCity: string
  destination: string
  departureDate: string
  returnDate: string
  tripType: 'round_trip' | 'one_way'
  passengers: number
  cabinClass: string
}

/** Valid Bahamas airport codes for URL-param validation. */
const BAHAMAS_DESTINATION_CODES = new Set(BAHAMAS_AIRPORT_OPTIONS.map(d => d.code))

/** Valid cabin classes for URL-param validation. */
const CABIN_VALUES = new Set(CABIN_CLASSES.map(c => c.value))

/** Strict ISO date regex (YYYY-MM-DD). Rejects malformed URL params. */
const ISO_DATE_RX = /^\d{4}-\d{2}-\d{2}$/

export default function FlightSearchClient() {
  const searchParams = useSearchParams()

  // Default departure: 14 days from today. Computed once via useMemo so it
  // doesn't shift while the user is typing.
  const defaultDeparture = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  }, [])
  const defaultReturn = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 19)
    return d.toISOString().split('T')[0]
  }, [])
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  // ── URL-param hydration (deep-link from HeroSearchPanel) ─────────────────
  // Pull initial values from the query string if present. Each is
  // validated against the same constraints the form would enforce.
  const initial = useMemo(() => {
    const origin = searchParams.get('origin')?.trim()
    const destination = searchParams.get('destination')?.trim()
    const depart = searchParams.get('depart')?.trim()
    const ret = searchParams.get('return')?.trim()
    const passengersRaw = searchParams.get('passengers')
    const cabin = searchParams.get('cabin')?.trim()
    const tripType = searchParams.get('tripType')?.trim()

    const passengersNum = passengersRaw ? Number(passengersRaw) : NaN

    return {
      origin: origin && origin.length > 0 ? origin : 'Miami',
      destination: destination && BAHAMAS_DESTINATION_CODES.has(destination) ? destination : 'NAS',
      depart: depart && ISO_DATE_RX.test(depart) && depart >= todayStr ? depart : defaultDeparture,
      returnDate: ret && ISO_DATE_RX.test(ret) ? ret : defaultReturn,
      passengers: Number.isFinite(passengersNum) && passengersNum >= 1 && passengersNum <= 9
        ? Math.floor(passengersNum)
        : 1,
      cabin: cabin && CABIN_VALUES.has(cabin) ? cabin : 'economy',
      tripType: (tripType === 'one_way' ? 'one_way' : 'round_trip') as 'round_trip' | 'one_way',
      /** True when the URL had at least one search param — used to auto-search on mount. */
      hasDeepLink:
        !!origin || !!destination || !!depart || !!ret || !!passengersRaw || !!cabin || !!tripType,
    }
  }, [searchParams, defaultDeparture, defaultReturn, todayStr])

  const [originCity, setOriginCity] = useState(initial.origin)
  const [destination, setDestination] = useState(initial.destination)
  const [departureDate, setDepartureDate] = useState(initial.depart)
  const [returnDate, setReturnDate] = useState(initial.returnDate)
  const [tripType, setTripType] = useState<'round_trip' | 'one_way'>(initial.tripType)
  const [passengers, setPassengers] = useState(initial.passengers)
  const [cabinClass, setCabinClass] = useState(initial.cabin)

  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [results, setResults] = useState<CardData[]>([])
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null)
  const [lastSearchLabel, setLastSearchLabel] = useState('Miami to Nassau')
  const [resultMode, setResultMode] = useState<FlightResultMode>('best')
  const passengerFilterRef = useRef<HTMLSelectElement>(null)
  const cabinFilterRef = useRef<HTMLSelectElement>(null)

  /** Default return date when user toggles to round-trip: departure + 5 days. */
  function ensureReturnDate(dep: string) {
    if (returnDate) return
    if (!dep) return
    const d = new Date(dep)
    d.setDate(d.getDate() + 5)
    setReturnDate(d.toISOString().split('T')[0])
  }

  /** Core search executor — stateless, takes everything as args so the
   *  auto-search-on-mount path (which fires before React commits any
   *  user typing) can call it with the URL-derived values directly. */
  async function runSearch(args: FlightSearchArgs) {
    setStatus('loading')
    setErrorMessage(null)
    setEmptyMessage(null)
    setResults([])
    setLastSearchLabel(searchLabel(args.originCity, args.destination))

    track('flight_search_started', {
      origin: args.originCity,
      destination: args.destination,
      departure_date: args.departureDate,
      return_date: args.returnDate || undefined,
      trip_type: args.tripType,
      passengers: args.passengers,
    })

    if (!args.originCity.trim()) {
      setErrorMessage('Tell us where you\u2019re flying from.')
      setStatus('error')
      return
    }

    try {
      syncFlightSearchUrl(args)
      const body: Record<string, unknown> = {
        origin_city: args.originCity.trim(),
        destination: args.destination,
        departure_date: args.departureDate,
        passengers: args.passengers,
        cabin_class: args.cabinClass,
      }
      if (args.tripType === 'round_trip' && args.returnDate) {
        body.return_date = args.returnDate
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

  // Auto-search on mount. Public visitors should immediately see that
  // this is a live flight surface, not an empty workbench. Deep links
  // still hydrate the route first.
  const didAutoSearchRef = useRef(false)
  useEffect(() => {
    if (didAutoSearchRef.current) return
    didAutoSearchRef.current = true
    const storedOrigin = initial.hasDeepLink ? null : readStoredTravelOrigin()?.origin ?? null
    const searchOrigin = storedOrigin ?? initial.origin
    if (storedOrigin) {
      setOriginCity(storedOrigin)
      track('flight_origin_preference_applied', {
        origin: storedOrigin,
        source: 'stored_preference',
        destination: initial.destination,
      })
    }
    void runSearch({
      originCity: searchOrigin,
      destination: initial.destination,
      departureDate: initial.depart,
      returnDate: initial.returnDate,
      tripType: initial.tripType,
      passengers: initial.passengers,
      cabinClass: initial.cabin,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleOriginUpdated(event: Event) {
      const nextOrigin = (event as CustomEvent<TravelOriginEventDetail>).detail?.origin?.trim()
      if (!nextOrigin) return
      setOriginCity(nextOrigin)
      track('flight_origin_preference_applied', {
        origin: nextOrigin,
        source: 'public_prompt_event',
        destination,
      })
      void runSearch({
        originCity: nextOrigin,
        destination,
        departureDate,
        returnDate,
        tripType,
        passengers,
        cabinClass,
      })
    }

    window.addEventListener(TRAVEL_ORIGIN_EVENT, handleOriginUpdated)
    return () => window.removeEventListener(TRAVEL_ORIGIN_EVENT, handleOriginUpdated)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, departureDate, returnDate, tripType, passengers, cabinClass])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await runSearch(currentSearchArgs())
  }

  async function handlePopularRoute(route: { label: string; origin: string; destination: string }) {
    setOriginCity(route.origin)
    setDestination(route.destination)
    setTripType('round_trip')
    if (!returnDate) setReturnDate(defaultReturn)
    await runSearch({
      originCity: route.origin,
      destination: route.destination,
      departureDate,
      returnDate: returnDate || defaultReturn,
      tripType: 'round_trip',
      passengers,
      cabinClass,
    })
  }

  function currentSearchArgs(overrides: Partial<FlightSearchArgs> = {}): FlightSearchArgs {
    return {
      originCity,
      destination,
      departureDate,
      returnDate,
      tripType,
      passengers,
      cabinClass,
      ...overrides,
    }
  }

  async function applySidebarFilters() {
    const nextPassengers = passengerFilterRef.current ? Number(passengerFilterRef.current.value) : passengers
    const nextCabinClass = cabinFilterRef.current?.value ?? cabinClass

    setPassengers(nextPassengers)
    setCabinClass(nextCabinClass)
    await runSearch(currentSearchArgs({
      passengers: nextPassengers,
      cabinClass: nextCabinClass,
    }))
  }

  function handleTripTypeChange(nextTripType: 'round_trip' | 'one_way') {
    setTripType(nextTripType)
    if (nextTripType === 'round_trip') {
      ensureReturnDate(departureDate)
    }
  }

  function syncFlightSearchUrl(args: FlightSearchArgs) {
    const params = new URLSearchParams()
    params.set('origin', args.originCity.trim())
    params.set('destination', args.destination)
    params.set('tripType', args.tripType)
    params.set('depart', args.departureDate)
    if (args.tripType === 'round_trip' && args.returnDate) {
      params.set('return', args.returnDate)
    }
    params.set('passengers', String(args.passengers))
    params.set('cabin', args.cabinClass)
    window.history.replaceState(null, '', `/flights?${params.toString()}`)
  }

  const isLoading = status === 'loading'
  const displayedResults = useMemo(
    () => rankFlightResults(results, resultMode),
    [results, resultMode],
  )
  const activeResultMode = FLIGHT_RESULT_MODES.find((mode) => mode.value === resultMode) ?? FLIGHT_RESULT_MODES[0]
  const nonstopCount = useMemo(
    () => rankFlightResults(results, 'nonstop').length,
    [results],
  )
  const destinationLabel = BAHAMAS_AIRPORT_OPTIONS.find((item) => item.code === destination)?.label ?? 'The Bahamas'
  const cabinLabel = CABIN_CLASSES.find(c => c.value === cabinClass)?.label ?? 'Economy'
  const travelerLabel = `${passengers} ${passengers === 1 ? 'traveler' : 'travelers'}`
  const personalizedRoutes = useMemo(() => {
    const origin = originCity.trim() || 'Miami'
    const primaryRoutes = [
      { label: `${origin} to Nassau`, origin, destination: 'NAS' },
      { label: `${origin} to Exuma`, origin, destination: 'EXU' },
      { label: `${origin} to Eleuthera`, origin, destination: 'ELH' },
    ]
    const seen = new Set(primaryRoutes.map((route) => `${route.origin}|${route.destination}`.toLowerCase()))
    return [
      ...primaryRoutes,
      ...POPULAR_ROUTES.filter((route) => {
        const key = `${route.origin}|${route.destination}`.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }).slice(0, 3),
    ]
  }, [originCity])

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleSubmit}
        className="rounded-baha-lg border border-gray-200 bg-white p-3 shadow-sm md:p-4"
        aria-label="Flight search"
      >
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">
              Inline flight search
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-night">
              Compare Bahamas flights
            </h2>
          </div>
          <p className="max-w-md text-xs font-semibold leading-5 text-gray-500 md:text-right">
            Search is public. Save, checkout, and booking require a traveler account.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(11rem,0.8fr)_minmax(11rem,0.8fr)_auto]">
          <TravelSearchField label="From" hint="City or airport" htmlFor="origin">
            <TravelSearchCombobox
              id="origin"
              name="origin"
              value={originCity}
              onChange={setOriginCity}
              options={ORIGIN_AIRPORT_OPTIONS}
              ariaLabel="From"
              allowCustomValue
              placeholder="Start typing your city or airport"
              emptyLabel="Type a city, airport name, or 3-letter airport code"
              helperText="Try Miami, West Palm Beach, JFK, Atlanta, Toronto"
              customOptionLabel={(query) => `Use "${query}" as departure city`}
            />
          </TravelSearchField>

          <TravelSearchField label="To" hint="Bahamas airport" htmlFor="destination">
            <TravelSearchCombobox
              id="destination"
              name="destination"
              value={destination}
              onChange={setDestination}
              options={BAHAMAS_AIRPORT_OPTIONS}
              ariaLabel="To"
              placeholder="Search island or airport"
              emptyLabel="Choose a Bahamas airport"
              helperText="Search by island, airport, or Bahamas airport code"
            />
          </TravelSearchField>

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
            placeholder="Departure"
          />

          {tripType === 'round_trip' ? (
            <BahaDatePicker
              id="return-date"
              name="return-date"
              label="Return"
              required
              minDate={departureDate || todayStr}
              value={returnDate}
              onChange={setReturnDate}
              placeholder="Return"
            />
          ) : (
            <div className="hidden xl:block" aria-hidden="true" />
          )}

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 xl:min-w-36"
            >
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                  </svg>
                  Searching
                </>
              ) : (
                <>
                  Search
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="grid gap-5 lg:grid-cols-[17.25rem_minmax(0,1fr)] lg:items-start min-[1120px]:grid-cols-[17.25rem_minmax(0,1fr)_15.5rem]">
        <aside
          aria-label="Flight filters"
          className="rounded-baha-lg border border-gray-200 bg-white shadow-sm lg:sticky lg:top-24"
        >
          <div className="border-b border-gray-100 bg-white px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">
              Filter flights
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-night">
              Refine results
            </h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
              {lastSearchLabel} · {travelerLabel} · {cabinLabel}
            </p>
          </div>

          <div className="space-y-5 p-4">
            <div>
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-night">
                Trip type
              </p>
              <div role="radiogroup" aria-label="Trip type" className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={tripType === 'round_trip'}
                  onClick={() => handleTripTypeChange('round_trip')}
                  className={`rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                    tripType === 'round_trip'
                      ? 'border-gray-900 bg-white text-night ring-2 ring-gray-100'
                      : 'border-gray-200 bg-white text-charcoal hover:border-gray-300 hover:bg-gray-50 hover:text-night'
                  }`}
                >
                  Round-trip
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={tripType === 'one_way'}
                  onClick={() => handleTripTypeChange('one_way')}
                  className={`rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                    tripType === 'one_way'
                      ? 'border-gray-900 bg-white text-night ring-2 ring-gray-100'
                      : 'border-gray-200 bg-white text-charcoal hover:border-gray-300 hover:bg-gray-50 hover:text-night'
                  }`}
                >
                  One-way
                </button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-night">
                Popular Bahamas routes
              </p>
              <div className="flex flex-wrap gap-2">
                {personalizedRoutes.map((route) => (
                  <button
                    key={route.label}
                    type="button"
                    onClick={() => void handlePopularRoute(route)}
                    disabled={isLoading}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-extrabold text-charcoal transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-night disabled:opacity-60"
                  >
                    {route.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <TravelSearchField label="Traveler count" hint="Per booking" htmlFor="passengers-filter">
                <TravelSearchSelect
                  ref={passengerFilterRef}
                  id="passengers-filter"
                  name="passengers-filter"
                  value={passengers}
                  onChange={e => setPassengers(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'traveler' : 'travelers'}
                    </option>
                  ))}
                </TravelSearchSelect>
              </TravelSearchField>

              <TravelSearchField label="Cabin class" hint="Fare family" htmlFor="cabin-class-filter">
                <TravelSearchSelect
                  ref={cabinFilterRef}
                  id="cabin-class-filter"
                  name="cabin-class-filter"
                  value={cabinClass}
                  onChange={e => setCabinClass(e.target.value)}
                >
                  {CABIN_CLASSES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </TravelSearchSelect>
              </TravelSearchField>
            </div>

            <div>
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-night">
                Result focus
              </p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {FLIGHT_RESULT_MODES.map((mode) => (
                  <FilterButton
                    key={mode.value}
                    active={resultMode === mode.value}
                    onClick={() => setResultMode(mode.value)}
                    tone={mode.value === 'best' ? 'brand' : 'neutral'}
                  >
                    {mode.value === 'nonstop' ? `Nonstop (${nonstopCount})` : mode.label}
                  </FilterButton>
                ))}
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">
                {activeResultMode.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void applySidebarFilters()}
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
            >
              {isLoading ? 'Applying filters' : 'Apply filters'}
            </button>

            <p className="text-xs font-semibold leading-5 text-gray-500">
              Prices can expire. Verify fare details before payment.
            </p>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          {status === 'error' && errorMessage && (
            <div
              role="alert"
              className="rounded-baha-md border border-coral-200 bg-coral-50 px-4 py-3 text-sm text-coral-800"
            >
              {errorMessage}
            </div>
          )}

          {isLoading && (
            <div className="space-y-3" aria-live="polite" aria-busy="true">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="h-24 rounded-2xl border border-gray-100 bg-gray-50 animate-pulse"
                />
              ))}
            </div>
          )}

          {status === 'results' && results.length > 0 && (
            <section aria-label="Flight results" className="space-y-2">
              <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">
                    Live results
                  </p>
                  <h2 className="text-lg font-extrabold text-night">
                    {lastSearchLabel}: {displayedResults.length} of {results.length} {results.length === 1 ? 'option' : 'options'}
                  </h2>
                </div>
                <p className="text-xs font-semibold text-gray-400">
                  Prices can expire. Verify before payment.
                </p>
              </div>

              <div className="space-y-1">
                {displayedResults.length > 0 ? (
                  displayedResults.map((card, idx) => (
                    <RichCardRenderer
                      key={String(card.provider_offer_id ?? card.offer_id ?? card.duffel_offer_id ?? idx)}
                      cardData={card}
                    />
                  ))
                ) : (
                  <div className="rounded-baha-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-charcoal" aria-hidden="true">
                      <FlightGlyph />
                    </div>
                    <p className="text-sm font-bold text-night">
                      No nonstop fares in this result set.
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      Switch to Best or try nearby dates to compare connecting fares.
                    </p>
                  </div>
                )}
              </div>
              <p className="px-1 pt-2 text-xs text-gray-400">
                Prices are live LiteAPI offers and may expire quickly. Verify the fare before payment.
              </p>
            </section>
          )}

          {status === 'results' && results.length === 0 && emptyMessage && (
            <div className="rounded-baha-lg border border-gray-200 bg-white p-8 text-center shadow-soft">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-charcoal" aria-hidden="true">
                <FlightGlyph />
              </div>
              <p className="text-sm text-gray-700">{emptyMessage}</p>
            </div>
          )}

          {status === 'idle' && (
            <div className="rounded-baha-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-charcoal shadow-sm ring-1 ring-gray-200" aria-hidden="true">
                <FlightGlyph />
              </div>
              <p className="text-sm font-medium text-night">
                Pick your dates above and we will pull live prices.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Daily nonstops to Nassau from Miami, Fort Lauderdale, New York,
                Atlanta, and more.
              </p>
            </div>
          )}
        </div>

        <aside
          aria-label="Flight promotions"
          className="space-y-4 lg:col-span-2 min-[1120px]:col-span-1 min-[1120px]:sticky min-[1120px]:top-24"
        >
          <section className="overflow-hidden rounded-baha-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">
                Promo space
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-night">
                Baha Deals
              </h2>
            </div>
            <div className="space-y-3 p-4">
              <p className="text-sm font-semibold leading-6 text-gray-600">
                Place seasonal flight offers, bank promos, and Bahamas travel packages here without pushing fare cards down the page.
              </p>
              <a
                href="/deals"
                className="inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
              >
                View current deals
              </a>
            </div>
          </section>

          <section className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
              Bundle this trip
            </p>
            <h3 className="mt-1 text-base font-extrabold text-night">
              Pair {destinationLabel} flights with top stays
            </h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
              Move from airfare to hotels with the same dates and trip context.
            </p>
            <a
              href="/stays?sort=stars"
              className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Browse stays
            </a>
          </section>

          <section className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
              Concierge prompt
            </p>
            <h3 className="mt-1 text-base font-extrabold text-night">
              Need arrival timing help?
            </h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
              Use this rail for transfer upsells, VIP arrival support, travel insurance, or destination guidance.
            </p>
            <a
              href="/concierge-trip-plan"
              className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-extrabold text-white transition-colors hover:bg-brand-700"
            >
              See concierge options
            </a>
          </section>
        </aside>
      </div>
    </div>
  )
}

function searchLabel(origin: string, destinationCode: string): string {
  const destination = BAHAMAS_AIRPORT_OPTIONS.find((item) => item.code === destinationCode)?.label ?? destinationCode
  return `${origin.trim() || 'Origin'} to ${destination}`
}

function FlightGlyph() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16l7-3V7a2 2 0 0 1 4 0v6l7 3v2l-7-2v3l2 1.5V22l-4-1-4 1v-1.5L10 19v-3l-7 2v-2Z" />
    </svg>
  )
}
