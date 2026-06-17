'use client'

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'

type TripOption = { id: string; name: string }

interface Props {
  offerId: string
  trips: TripOption[]
}

type Traveler = {
  firstName: string
  lastName: string
  email: string
  phoneCountryCode: string
  phoneNumber: string
  birthday: string
  gender: string
  nationality: string
  documentNumber: string
  documentIssueCountry: string
  documentExpiry: string
}

const emptyTraveler: Traveler = {
  firstName: '',
  lastName: '',
  email: '',
  phoneCountryCode: '1',
  phoneNumber: '',
  birthday: '',
  gender: 'M',
  nationality: 'US',
  documentNumber: '',
  documentIssueCountry: 'US',
  documentExpiry: '',
}

export default function FlightOfferBookingClient({ offerId, trips }: Props) {
  const [tripId, setTripId] = useState(trips[0]?.id ?? '')
  const [traveler, setTraveler] = useState<Traveler>(emptyTraveler)
  const [verification, setVerification] = useState<Record<string, unknown> | null>(null)
  const [prebook, setPrebook] = useState<Record<string, unknown> | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [stage, setStage] = useState<'loading' | 'details' | 'payment' | 'processing' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function verify() {
      try {
        const data = await postJson('/api/booking/flights/verify', { offerId })
        if (!cancelled) {
          setVerification(data)
          setStage('details')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not verify this fare.')
          setStage('error')
        }
      }
    }
    verify()
    return () => { cancelled = true }
  }, [offerId])

  const price = Number(verification?.price ?? 0)
  const currency = String(verification?.currency ?? 'USD')
  const formattedPrice = useMemo(() => {
    if (!price) return 'Pending verification'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)
  }, [price, currency])

  async function createPrebook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tripId) {
      setError('Create or select a trip before booking this flight.')
      return
    }
    setError(null)
    setStage('processing')

    try {
      await addFlightToTrip(tripId, offerId, verification)
      const result = await postJson('/api/booking/flights/prebook', {
        offerId,
        contact: {
          firstName: traveler.firstName,
          lastName: traveler.lastName,
          email: traveler.email,
          phoneCountryCode: traveler.phoneCountryCode,
          phoneNumber: traveler.phoneNumber,
        },
        passengers: [{
          firstName: traveler.firstName,
          lastName: traveler.lastName,
          birthday: traveler.birthday,
          gender: traveler.gender,
          nationality: traveler.nationality,
          documentType: 'passport',
          documentNumber: traveler.documentNumber,
          documentIssueCountry: traveler.documentIssueCountry,
          documentExpiry: traveler.documentExpiry,
        }],
      })

      const clientSecret = String(result.client_secret ?? result.clientSecret ?? result.secretKey ?? '')
      const publishableKey = String(result.publishable_key ?? result.publishableKey ?? '')
      if (!clientSecret || !publishableKey) throw new Error('Provider did not return payment setup details.')

      setPrebook(result)
      setStripePromise(loadStripe(publishableKey))
      setStage('payment')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start flight checkout.')
      setStage('error')
    }
  }

  const update = (key: keyof Traveler, value: string) => setTraveler((current) => ({ ...current, [key]: value }))
  const prebookId = String(prebook?.prebook_id ?? prebook?.prebookId ?? '')
  const transactionId = String(prebook?.transaction_id ?? prebook?.transactionId ?? '')
  const clientSecret = String(prebook?.client_secret ?? prebook?.clientSecret ?? prebook?.secretKey ?? '')

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-10 text-night-900">
      <section className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-sand-200">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">Secure flight booking</p>
          <h1 className="font-serif text-3xl font-bold text-night-950">Book this fare</h1>
          <p className="mt-2 text-sm text-night-600">Offer {offerId} · {formattedPrice}</p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl bg-coral-50 p-4 text-sm font-medium text-coral-800 ring-1 ring-coral-200">
            {error}
          </div>
        )}

        {stage === 'loading' && <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-sand-200">Verifying fare...</div>}

        {stage !== 'payment' && stage !== 'loading' && (
          <form onSubmit={createPrebook} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-sand-200">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Trip">
                <select value={tripId} onChange={(e) => setTripId(e.target.value)} className="input" required>
                  {trips.length === 0 ? <option value="">No trips found</option> : null}
                  {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
                </select>
              </Field>
              <Field label="Email"><input type="email" value={traveler.email} onChange={(e) => update('email', e.target.value)} className="input" required /></Field>
              <Field label="First name"><input value={traveler.firstName} onChange={(e) => update('firstName', e.target.value)} className="input" required /></Field>
              <Field label="Last name"><input value={traveler.lastName} onChange={(e) => update('lastName', e.target.value)} className="input" required /></Field>
              <Field label="Phone country code"><input value={traveler.phoneCountryCode} onChange={(e) => update('phoneCountryCode', e.target.value)} className="input" required /></Field>
              <Field label="Phone number"><input value={traveler.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} className="input" required /></Field>
              <Field label="Date of birth"><input type="date" value={traveler.birthday} onChange={(e) => update('birthday', e.target.value)} className="input" required /></Field>
              <Field label="Gender"><select value={traveler.gender} onChange={(e) => update('gender', e.target.value)} className="input"><option value="M">Male</option><option value="F">Female</option></select></Field>
              <Field label="Nationality"><input value={traveler.nationality} onChange={(e) => update('nationality', e.target.value.toUpperCase())} className="input" maxLength={2} required /></Field>
              <Field label="Passport number"><input value={traveler.documentNumber} onChange={(e) => update('documentNumber', e.target.value)} className="input" required /></Field>
              <Field label="Passport issue country"><input value={traveler.documentIssueCountry} onChange={(e) => update('documentIssueCountry', e.target.value.toUpperCase())} className="input" maxLength={2} required /></Field>
              <Field label="Passport expiry"><input type="date" value={traveler.documentExpiry} onChange={(e) => update('documentExpiry', e.target.value)} className="input" required /></Field>
            </div>
            <button type="submit" disabled={stage === 'processing' || trips.length === 0} className="mt-6 w-full rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60">
              {stage === 'processing' ? 'Preparing secure payment...' : `Continue to pay ${formattedPrice}`}
            </button>
          </form>
        )}

        {stage === 'payment' && stripePromise && clientSecret && prebookId && transactionId && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <FlightPaymentForm
              tripId={tripId}
              offerId={offerId}
              prebookId={prebookId}
              transactionId={transactionId}
              setError={setError}
              setStage={setStage}
            />
          </Elements>
        )}
      </section>
    </main>
  )
}

function FlightPaymentForm({
  tripId,
  offerId,
  prebookId,
  transactionId,
  setError,
  setStage,
}: {
  tripId: string
  offerId: string
  prebookId: string
  transactionId: string
  setError: (value: string | null) => void
  setStage: (value: 'loading' | 'details' | 'payment' | 'processing' | 'error') => void
}) {
  const stripe = useStripe()
  const elements = useElements()

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe || !elements) return
    setStage('processing')
    setError(null)

    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (error || paymentIntent?.status !== 'succeeded') {
      setError(error?.message ?? 'Payment was not completed.')
      setStage('payment')
      return
    }

    try {
      const result = await postJson('/api/booking/flights/book', {
        offerId,
        prebookId,
        transactionId,
        tripId,
      })
      const bookingId = result.bookingRecordId ?? result.bookingId ?? result.booking_reference ?? prebookId
      window.location.href = `/trip/${encodeURIComponent(tripId)}?booking=${encodeURIComponent(String(bookingId))}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment succeeded, but provider booking failed. Contact support with your payment reference.')
      setStage('error')
    }
  }

  return (
    <form onSubmit={submitPayment} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-sand-200">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button type="submit" disabled={!stripe || !elements} className="mt-6 w-full rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60">
        Pay and confirm flight
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-night-500">{label}</span>
      {children}
    </label>
  )
}

async function addFlightToTrip(tripId: string, offerId: string, verification: Record<string, unknown> | null) {
  await postJson(`/api/trips/${encodeURIComponent(tripId)}/items`, {
    itemType: 'flight',
    sourceId: offerId,
    sourceType: 'web_flight_booking',
    name: `Flight offer ${offerId}`,
    provider: 'liteapi',
    providerOfferId: offerId,
    origin: stringValue(verification?.origin),
    destination: stringValue(verification?.destination),
    departureAt: stringValue(verification?.departure_at),
    arrivalAt: stringValue(verification?.arrival_at),
    airline: stringValue(verification?.airline),
    price: Number(verification?.price ?? 0),
    currency: String(verification?.currency ?? 'USD'),
  })
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Request failed.')
  return data
}
