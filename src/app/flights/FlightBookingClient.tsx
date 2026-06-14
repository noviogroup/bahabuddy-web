'use client'

import { FormEvent, useMemo, useState } from 'react'

type JsonRecord = Record<string, unknown>

type FlightOffer = {
  offerId: string
  price: string
  airline: string
  summary: string
  expiration?: string
  raw: unknown
}

const initialPrebookPayload = `{
  "contact": {},
  "passengers": []
}`

const initialBookPayload = `{
  "payment": {}
}`

export default function FlightBookingClient() {
  const [origin, setOrigin] = useState('NAS')
  const [destination, setDestination] = useState('MIA')
  const [departureDate, setDepartureDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [roundTrip, setRoundTrip] = useState(false)
  const [adults, setAdults] = useState(1)
  const [currency, setCurrency] = useState('USD')
  const [country, setCountry] = useState('US')
  const [cabinClass, setCabinClass] = useState('ECONOMY')

  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchData, setSearchData] = useState<unknown>(null)
  const [selectedOffer, setSelectedOffer] = useState<FlightOffer | null>(null)
  const [verifiedData, setVerifiedData] = useState<unknown>(null)
  const [prebookData, setPrebookData] = useState<unknown>(null)
  const [bookData, setBookData] = useState<unknown>(null)
  const [prebookPayload, setPrebookPayload] = useState(initialPrebookPayload)
  const [bookPayload, setBookPayload] = useState(initialBookPayload)

  const offers = useMemo(() => collectOffers(searchData), [searchData])
  const prebookId = useMemo(() => findFirstString(prebookData, ['prebookId', 'id']), [prebookData])
  const transactionId = useMemo(() => findFirstString(prebookData, ['transactionId']), [prebookData])
  const clientSecret = useMemo(() => findFirstString(prebookData, ['secretKey', 'clientSecret']), [prebookData])

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSelectedOffer(null)
    setVerifiedData(null)
    setPrebookData(null)
    setBookData(null)

    try {
      const legs = [
        { origin, destination, date: departureDate, direction: 'OUTBOUND' },
        ...(roundTrip && returnDate
          ? [{ origin: destination, destination: origin, date: returnDate, direction: 'INBOUND' }]
          : []),
      ]

      const data = await postJson('/api/booking/flights/search', {
        legs,
        adults,
        currency,
        country,
        cabinClass,
      })
      setSearchData(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function verifyOffer(offer: FlightOffer) {
    setWorking(true)
    setError(null)
    setSelectedOffer(offer)
    setVerifiedData(null)
    setPrebookData(null)
    setBookData(null)

    try {
      const data = await postJson('/api/booking/flights/verify', { offerId: offer.offerId })
      setVerifiedData(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setWorking(false)
    }
  }

  async function createPrebook() {
    if (!selectedOffer) return
    setWorking(true)
    setError(null)
    setPrebookData(null)
    setBookData(null)

    try {
      const extraPayload = JSON.parse(prebookPayload || '{}') as JsonRecord
      const data = await postJson('/api/booking/flights/prebook', {
        ...extraPayload,
        offerId: selectedOffer.offerId,
        usePaymentSdk: extraPayload.usePaymentSdk ?? true,
      })
      setPrebookData(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setWorking(false)
    }
  }

  async function confirmBooking() {
    setWorking(true)
    setError(null)
    setBookData(null)

    try {
      const extraPayload = JSON.parse(bookPayload || '{}') as JsonRecord
      const data = await postJson('/api/booking/flights/book', {
        ...extraPayload,
        ...(prebookId ? { prebookId } : {}),
      })
      setBookData(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setWorking(false)
    }
  }

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-10 text-night-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-sand-200 md:p-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">Live flight booking</p>
          <h1 className="font-serif text-4xl font-bold text-night-950 md:text-5xl">Search, verify, prebook, and confirm flights</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-night-600">
            This page is the first production flight-booking workbench. The provider key stays server-side; the browser only talks to Baha Buddy API routes.
          </p>
        </div>

        <form onSubmit={handleSearch} className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-sand-200 md:grid-cols-6 md:p-8">
          <Field label="From">
            <input value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} className="input" maxLength={3} required />
          </Field>
          <Field label="To">
            <input value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} className="input" maxLength={3} required />
          </Field>
          <Field label="Depart">
            <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="input" required />
          </Field>
          <Field label="Adults">
            <input type="number" min={1} value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="input" required />
          </Field>
          <Field label="Currency">
            <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="input" maxLength={3} required />
          </Field>
          <Field label="Country">
            <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} className="input" maxLength={2} required />
          </Field>

          <label className="flex items-center gap-3 rounded-2xl border border-sand-200 px-4 py-3 text-sm font-semibold text-night-700 md:col-span-2">
            <input type="checkbox" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />
            Round trip
          </label>

          {roundTrip ? (
            <Field label="Return">
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="input" />
            </Field>
          ) : null}

          <Field label="Cabin">
            <select value={cabinClass} onChange={(e) => setCabinClass(e.target.value)} className="input">
              <option value="ECONOMY">Economy</option>
              <option value="PREMIUM_ECONOMY">Premium economy</option>
              <option value="BUSINESS">Business</option>
              <option value="FIRST">First</option>
            </select>
          </Field>

          <div className="md:col-span-2 md:col-start-5">
            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60">
              {loading ? 'Searching…' : 'Search flights'}
            </button>
          </div>
        </form>

        {error ? <div className="mt-6 rounded-2xl bg-coral-50 p-4 text-sm font-medium text-coral-800 ring-1 ring-coral-200">{error}</div> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-night-950">Flight results</h2>
            {offers.length === 0 ? (
              <EmptyState title="No flights loaded yet" text="Search a route to see live offers." />
            ) : (
              offers.map((offer, index) => (
                <article key={`${offer.offerId}-${index}`} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-sand-200">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">{offer.airline}</p>
                      <h3 className="mt-1 text-xl font-bold text-night-950">{offer.summary}</h3>
                      <p className="mt-2 text-sm text-night-500">Offer ID captured. Verify before checkout.</p>
                      {offer.expiration ? <p className="mt-1 text-xs text-night-400">Expires: {offer.expiration}</p> : null}
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-2xl font-bold text-night-950">{offer.price}</p>
                      <button type="button" onClick={() => verifyOffer(offer)} disabled={working} className="mt-3 rounded-2xl bg-night-950 px-5 py-2 text-sm font-semibold text-white hover:bg-night-800 disabled:opacity-60">
                        Verify rate
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>

          <aside className="space-y-4">
            <h2 className="text-2xl font-bold text-night-950">Booking steps</h2>
            <StepCard title="1. Verified rate" data={verifiedData} active={Boolean(selectedOffer)} />

            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-sand-200">
              <h3 className="text-lg font-bold text-night-950">2. Prebook payload</h3>
              <p className="mt-2 text-sm text-night-500">Paste the required contact and traveler details in provider format, then create a prebook.</p>
              <textarea value={prebookPayload} onChange={(e) => setPrebookPayload(e.target.value)} className="mt-4 h-44 w-full rounded-2xl border border-sand-200 bg-sand-50 p-3 font-mono text-xs text-night-800 outline-none focus:border-brand-500" />
              <button type="button" onClick={createPrebook} disabled={!selectedOffer || working} className="mt-4 w-full rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                Create prebook
              </button>
              {prebookData ? (
                <div className="mt-4 rounded-2xl bg-sand-50 p-3 text-xs text-night-700">
                  {prebookId ? <p><strong>Prebook ID:</strong> {prebookId}</p> : null}
                  {transactionId ? <p><strong>Transaction ID:</strong> {transactionId}</p> : null}
                  {clientSecret ? <p><strong>Client secret:</strong> received</p> : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-sand-200">
              <h3 className="text-lg font-bold text-night-950">3. Confirm booking</h3>
              <p className="mt-2 text-sm text-night-500">After payment is confirmed, submit the provider booking payload.</p>
              <textarea value={bookPayload} onChange={(e) => setBookPayload(e.target.value)} className="mt-4 h-36 w-full rounded-2xl border border-sand-200 bg-sand-50 p-3 font-mono text-xs text-night-800 outline-none focus:border-brand-500" />
              <button type="button" onClick={confirmBooking} disabled={!prebookData || working} className="mt-4 w-full rounded-2xl bg-night-950 px-5 py-3 font-semibold text-white hover:bg-night-800 disabled:opacity-60">
                Confirm booking
              </button>
            </div>

            <StepCard title="Confirmation response" data={bookData} active={Boolean(bookData)} />
          </aside>
        </div>
      </section>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-night-700">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  )
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-sm ring-1 ring-sand-200">
      <h3 className="text-lg font-bold text-night-950">{title}</h3>
      <p className="mt-2 text-sm text-night-500">{text}</p>
    </div>
  )
}

function StepCard({ title, data, active }: { title: string; data: unknown; active: boolean }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-sand-200">
      <h3 className="text-lg font-bold text-night-950">{title}</h3>
      {active && data ? (
        <pre className="mt-4 max-h-80 overflow-auto rounded-2xl bg-night-950 p-4 text-xs text-white">{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p className="mt-2 text-sm text-night-500">Waiting for the previous step.</p>
      )}
    </div>
  )
}

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}.`)
  }
  return data
}

function collectOffers(data: unknown): FlightOffer[] {
  const offers: FlightOffer[] = []
  const seen = new Set<string>()

  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }

    const record = value as JsonRecord
    const offerId = typeof record.offerId === 'string' ? record.offerId : null

    if (offerId && !seen.has(offerId)) {
      seen.add(offerId)
      offers.push({
        offerId,
        price: extractPrice(record),
        airline: extractAirline(record),
        summary: extractSummary(record),
        expiration: typeof record.expiration === 'string' ? record.expiration : undefined,
        raw: value,
      })
    }

    Object.values(record).forEach(visit)
  }

  visit(data)
  return offers.slice(0, 30)
}

function extractPrice(record: JsonRecord): string {
  const pricing = record.pricing as JsonRecord | undefined
  const display = pricing?.display as JsonRecord | undefined
  const total = display?.total ?? pricing?.total ?? record.totalPrice ?? record.total
  const currency = display?.currency ?? pricing?.currency ?? record.currency ?? 'USD'

  if (typeof total === 'number') return `${currency} ${total.toFixed(2)}`
  if (typeof total === 'string') return `${currency} ${total}`
  return 'Rate available'
}

function extractAirline(record: JsonRecord): string {
  const carrier = record.carrier as JsonRecord | undefined
  const airline = record.airline as JsonRecord | undefined
  const name = record.airlineName ?? carrier?.name ?? airline?.name ?? record.provider
  return typeof name === 'string' ? name : 'Flight option'
}

function extractSummary(record: JsonRecord): string {
  const legs = Array.isArray(record.legs) ? record.legs : []
  const segments = Array.isArray(record.segments) ? record.segments : []
  const parts = [...legs, ...segments]
    .map((item) => {
      const row = item as JsonRecord
      const from = row.origin ?? row.from ?? row.departureAirport
      const to = row.destination ?? row.to ?? row.arrivalAirport
      if (typeof from === 'string' && typeof to === 'string') return `${from} → ${to}`
      return null
    })
    .filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : 'Selected itinerary'
}

function findFirstString(data: unknown, keys: string[]): string | null {
  if (!data || typeof data !== 'object') return null
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findFirstString(item, keys)
      if (result) return result
    }
    return null
  }

  const record = data as JsonRecord
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }

  for (const value of Object.values(record)) {
    const result = findFirstString(value, keys)
    if (result) return result
  }

  return null
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}
