'use client'

/** Search first, then compare fares with editable context and on-demand details. */

import { useState, useMemo, useEffect, useRef, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { RichCardRenderer, providerOfferIdFromCard, type CardData } from '@/components/RichCards'
import SearchSummaryPanel from '@/components/marketplace/SearchSummaryPanel'
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
      origin: origin && origin.length > 0 ? origin : '',
      destination: destination && BAHAMAS_DESTINATION_CODES.has(destination) ? destination : 'NAS',
      depart: depart && ISO_DATE_RX.test(depart) && depart >= todayStr ? depart : '',
      returnDate: ret && ISO_DATE_RX.test(ret) ? ret : '',
      passengers: Number.isFinite(passengersNum) && passengersNum >= 1 && passengersNum <= 9
        ? Math.floor(passengersNum)
        : 1,
      cabin: cabin && CABIN_VALUES.has(cabin) ? cabin : 'economy',
      tripType: (tripType === 'one_way' ? 'one_way' : 'round_trip') as 'round_trip' | 'one_way',
    }
  }, [searchParams, todayStr])

  const [originCity, setOriginCity] = useState(initial.origin)
  const [destination, setDestination] = useState(initial.destination)
  const [departureDate, setDepartureDate] = useState(initial.depart)
  const [returnDate, setReturnDate] = useState(initial.returnDate)
  const [tripType, setTripType] = useState<'round_trip' | 'one_way'>(initial.tripType)
  const [passengers, setPassengers] = useState(initial.passengers)
  const [cabinClass, setCabinClass] = useState(initial.cabin)
  const [tripDetailsOpen, setTripDetailsOpen] = useState(false)
  const tripDetailsRef = useRef<HTMLDivElement>(null)

  const [searchOpen, setSearchOpen] = useState(true)
  const [submittedSearch, setSubmittedSearch] = useState<FlightSearchArgs | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [results, setResults] = useState<CardData[]>([])
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null)
  const [lastSearchLabel, setLastSearchLabel] = useState('')
  const [resultMode, setResultMode] = useState<FlightResultMode>('best')

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
      setSearchOpen(true)
      setStatus('error')
      return
    }

    if (!args.departureDate || args.departureDate < todayStr ||
        (args.tripType === 'round_trip' && (!args.returnDate || args.returnDate < args.departureDate))) {
      setErrorMessage(args.tripType === 'round_trip' ? 'Choose departure and return dates for your trip.' : 'Choose a departure date for your trip.')
      setSearchOpen(true)
      setStatus('error')
      return
    }
    setSubmittedSearch(args)
    setResultMode('best')
    setSearchOpen(false)
    setTripDetailsOpen(false)

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
        setSearchOpen(true)
        setStatus('error')
        return
      }

      // Executor can return either { results, cards } or { error, results: [] }
      if (payload.error) {
        setErrorMessage(payload.error as string)
        setSearchOpen(true)
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
      setSearchOpen(true)
      setStatus('error')
    }
  }

  // Only search when the traveler supplied a complete route and dates.
  const didAutoSearchRef = useRef(false)
  useEffect(() => {
    if (didAutoSearchRef.current) return
    didAutoSearchRef.current = true
    const storedOrigin = initial.origin ? null : readStoredTravelOrigin()?.origin ?? null
    const searchOrigin = storedOrigin ?? initial.origin
    if (storedOrigin) {
      setOriginCity(storedOrigin)
      track('flight_origin_preference_applied', {
        origin: storedOrigin,
        source: 'stored_preference',
        destination: initial.destination,
      })
    }
    if (!searchOrigin || !initial.depart || (initial.tripType === 'round_trip' && !initial.returnDate)) return
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
      setSearchOpen(true)
      if (!departureDate || (tripType === 'round_trip' && !returnDate)) return
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

  useEffect(() => {
    if (!tripDetailsOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (tripDetailsRef.current && !tripDetailsRef.current.contains(event.target as Node)) {
        setTripDetailsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [tripDetailsOpen])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await runSearch(currentSearchArgs())
  }

  async function handlePopularRoute(route: { label: string; origin: string; destination: string }) {
    setOriginCity(route.origin)
    setDestination(route.destination)
    setSearchOpen(true)
    if (departureDate && (tripType === 'one_way' || returnDate)) {
      await runSearch(currentSearchArgs({ originCity: route.origin, destination: route.destination }))
    }
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

  function handleTripTypeChange(nextTripType: 'round_trip' | 'one_way') {
    setTripType(nextTripType)

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
    const currentRoutePath = window.location.pathname
    const routePath = currentRoutePath.startsWith('/dashboard/flights')
      ? '/dashboard/flights'
      : '/flights'
    window.history.replaceState(null, '', `${routePath}?${params.toString()}`)
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

  const searchGridClassName = 'grid grid-cols-1 gap-3 md:grid-cols-2'
  const searchActionCellClassName = 'flex items-end md:col-span-2'
  const summarySearch = submittedSearch ?? currentSearchArgs()
  const summaryDates = [summarySearch.departureDate, summarySearch.tripType === 'round_trip' ? summarySearch.returnDate : '']
    .filter(Boolean).map(date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })).join(' – ')
  const summaryCabin = CABIN_CLASSES.find(c => c.value === summarySearch.cabinClass)?.label ?? 'Economy'

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-night">Find flights</h1>
        <p className="mt-2 text-sm text-gray-600">Choose your route and dates. Compare fares in one place.</p>
      </header>
      <SearchSummaryPanel
        summary={summarySearch.originCity ? searchLabel(summarySearch.originCity, summarySearch.destination) : 'Where are you flying from?'}
        detail={`${summarySearch.tripType === 'round_trip' ? 'Round-trip' : 'One-way'} · ${summaryDates || 'Add travel dates'} · ${summarySearch.passengers} traveler${summarySearch.passengers === 1 ? '' : 's'} · ${summaryCabin}`}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      >
      <form onSubmit={handleSubmit} aria-label="Flight search">
          <div className="mb-4 border-b border-gray-100">
            <div role="radiogroup" aria-label="Trip type" className="flex flex-wrap gap-5">
              <button
                type="button"
                role="radio"
                aria-checked={tripType === 'round_trip'}
                onClick={() => handleTripTypeChange('round_trip')}
                className={`inline-flex min-h-11 items-center border-b-2 px-1 text-sm font-semibold transition-colors ${
                  tripType === 'round_trip'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-charcoal hover:border-gray-300 hover:text-night'
                }`}
              >
                Round-trip
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={tripType === 'one_way'}
                onClick={() => handleTripTypeChange('one_way')}
                className={`inline-flex min-h-11 items-center border-b-2 px-1 text-sm font-semibold transition-colors ${
                  tripType === 'one_way'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-charcoal hover:border-gray-300 hover:text-night'
                }`}
              >
                One-way
              </button>
            </div>
          </div>

          <div className={searchGridClassName}>
            <TravelSearchField className="!border-0 !p-0 !shadow-none" label="From" htmlFor="origin">
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

            <TravelSearchField className="!border-0 !p-0 !shadow-none" label="To" htmlFor="destination">
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

            <div>
              <div className={`grid gap-3 ${tripType === 'round_trip' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                <BahaDatePicker
                  id="departure-date"
                  label="Departure"
                  name="departure-date"
                  ariaLabel="Departure date"
                  required
                  minDate={todayStr}
                  value={departureDate}
                  onChange={(v) => {
                    setDepartureDate(v)
                    if (returnDate && v > returnDate) {
                      setReturnDate('')
                    }
                  }}
                  placeholder="Depart"
                />
                {tripType === 'round_trip' && (
                  <BahaDatePicker
                    id="return-date"
                    label="Return"
                    name="return-date"
                    ariaLabel="Return date"
                    required
                    minDate={departureDate || todayStr}
                    value={returnDate}
                    onChange={setReturnDate}
                    placeholder="Return"
                  />
                )}
              </div>
            </div>

            <TravelSearchField className="!border-0 !p-0 !shadow-none" label="Travelers & cabin" htmlFor="passengers-search">
              <div ref={tripDetailsRef} className="relative">
                <button
                  id="passengers-search"
                  type="button"
                  aria-label="Edit travelers and cabin"
                  aria-expanded={tripDetailsOpen}
                  aria-haspopup="dialog"
                  onClick={() => setTripDetailsOpen((open) => !open)}
                  className={`flex h-12 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 text-left text-sm font-semibold outline-none transition-all ${
                    tripDetailsOpen
                      ? 'border-gray-500 ring-4 ring-gray-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="min-w-0 truncate text-night">
                    {travelerLabel}, {cabinLabel}
                  </span>
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-sm" aria-hidden="true">
                    <svg className={`h-4 w-4 transition-transform ${tripDetailsOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none">
                      <path d="M5 7.5 10 12l5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>

                {tripDetailsOpen && (
                  <div
                    role="dialog"
                    aria-label="Choose travelers and cabin"
                    className="absolute right-0 z-[90] mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl shadow-gray-950/10 ring-1 ring-black/5"
                  >
                    <div className="grid gap-3">
                      <div>
                        <label htmlFor="passengers-search-select" className="mb-2 block px-1 text-xs font-semibold uppercase text-gray-500">
                          Travelers
                        </label>
                        <TravelSearchSelect
                          id="passengers-search-select"
                          name="passengers-search"
                          aria-label="Travelers"
                          value={passengers}
                          onChange={e => setPassengers(Number(e.target.value))}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? 'traveler' : 'travelers'}
                            </option>
                          ))}
                        </TravelSearchSelect>
                      </div>

                      <div>
                        <label htmlFor="cabin-class-search" className="mb-2 block px-1 text-xs font-semibold uppercase text-gray-500">
                          Cabin
                        </label>
                        <TravelSearchSelect
                          id="cabin-class-search"
                          name="cabin-class-search"
                          aria-label="Cabin"
                          value={cabinClass}
                          onChange={e => setCabinClass(e.target.value)}
                        >
                          {CABIN_CLASSES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </TravelSearchSelect>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTripDetailsOpen(false)}
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                      >
                        Done
                      </button>
                    </div>
                    <button type="button" onClick={() => setResultMode('best')} className="mt-3 min-h-11 rounded-full border border-gray-200 px-4 text-sm font-semibold text-brand-700">Show all flights</button>
                  </div>
                )}
              </div>
            </TravelSearchField>

            <div className={searchActionCellClassName}>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 xl:min-w-36"
              >
                {isLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin motion-reduce:animate-none" fill="none" viewBox="0 0 24 24">
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
      </SearchSummaryPanel>

      {status === 'idle' && <section aria-label="Popular flight routes" className="rounded-baha-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">
              Try a route
            </p>
            <p className="mt-0.5 text-sm font-semibold text-night">
              Choose a route, then add your dates.
            </p>
          </div>
          <div className="relative -mr-4 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-10 after:bg-gradient-to-l after:from-white after:to-transparent lg:mr-0 lg:after:hidden">
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 pr-10 lg:mx-0 lg:flex-wrap lg:justify-end lg:pr-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {personalizedRoutes.slice(0, 3).map((route) => (
              <button
                key={route.label}
                type="button"
                onClick={() => void handlePopularRoute(route)}
                disabled={isLoading}
                className="inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-night disabled:opacity-60"
              >
                {route.label}
              </button>
            ))}
          </div>
          </div>
        </div>
      </section>}

      <div>
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
              <div className="rounded-baha-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 animate-spin motion-reduce:animate-none text-brand-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                  </svg>
                  <p className="text-sm font-semibold text-night">
                    Fetching live fare options for {lastSearchLabel}
                  </p>
                </div>
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  Checking availability for your trip…
                </p>
              </div>
              {[0, 1, 2].map(index => <div key={index} className="h-36 animate-pulse rounded-baha-lg bg-gray-100 motion-reduce:animate-none" aria-hidden="true" />)}
            </div>
          )}

          {status === 'results' && results.length > 0 && (
            <section aria-label="Flight results" className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="mt-0.5 text-lg font-bold text-night">
                      {displayedResults.length} {displayedResults.length === 1 ? 'flight' : 'flights'}{resultMode === 'nonstop' ? ` of ${results.length}` : ''}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-gray-500">
                      Total prices for {submittedSearch?.passengers ?? passengers} traveler{(submittedSearch?.passengers ?? passengers) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="relative -mr-3 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-10 after:bg-gradient-to-l after:from-white after:to-transparent lg:mr-0 lg:after:hidden">
                    <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 pr-10 lg:mx-0 lg:flex-wrap lg:justify-end lg:pr-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium leading-5 text-gray-500">
                  {activeResultMode.description} Prices can expire, so verify before payment.
                </p>
              </div>

              <div className="space-y-3">
                {displayedResults.length > 0 ? (
                  displayedResults.map((card, idx) => (
                    <RichCardRenderer
                      key={String(providerOfferIdFromCard(card) ?? idx)}
                      cardData={card}
                    />
                  ))
                ) : (
                  <div className="rounded-baha-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-charcoal" aria-hidden="true">
                      <FlightGlyph />
                    </div>
                    <p className="text-sm font-semibold text-night">
                      No nonstop fares in this result set.
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      Switch to Best or try nearby dates to compare connecting fares.
                    </p>
                    <button type="button" onClick={() => setResultMode('best')} className="mt-3 min-h-11 rounded-full border border-gray-200 px-4 text-sm font-semibold text-brand-700">Show all flights</button>
                  </div>
                )}
              </div>
              <p className="px-1 pt-2 text-xs text-gray-400">
                Prices are live and may expire quickly. Verify the fare before payment.
              </p>
            </section>
          )}

          {status === 'results' && results.length === 0 && emptyMessage && (
            <div className="rounded-baha-lg border border-gray-200 bg-white p-8 text-center shadow-soft">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-charcoal" aria-hidden="true">
                <FlightGlyph />
              </div>
              <p className="text-sm text-gray-700">{emptyMessage}</p>
              <button type="button" onClick={() => setSearchOpen(true)} className="mt-3 min-h-11 rounded-full border border-gray-200 px-4 text-sm font-semibold text-brand-700">Change dates or route</button>
            </div>
          )}

        </div>
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
