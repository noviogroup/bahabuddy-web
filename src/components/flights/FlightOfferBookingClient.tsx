'use client'

import Link from 'next/link'
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import {
  routeCodesFromSummary,
  type FlightCheckoutSummary,
} from '@/lib/flight-checkout-summary'
import {
  TravelSearchField,
  TravelSearchInput,
  TravelSearchSelect,
} from '@/components/marketplace/TravelSearchFields'

type TripOption = { id: string; name: string }

interface Props {
  offerId: string
  trips: TripOption[]
  summary?: FlightCheckoutSummary
  returnTo?: string
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

function createTravelers(count: number): Traveler[] {
  return Array.from({ length: count }, () => ({ ...emptyTraveler }))
}

export default function FlightOfferBookingClient({ offerId, trips, summary, returnTo }: Props) {
  const [tripId, setTripId] = useState(trips[0]?.id ?? '')
  const passengerCount = Math.max(1, Math.min(9, Math.round(Number(summary?.passengers ?? 1) || 1)))
  const [travelers, setTravelers] = useState<Traveler[]>(() => createTravelers(passengerCount))
  const [prebook, setPrebook] = useState<Record<string, unknown> | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [stage, setStage] = useState<'details' | 'payment' | 'processing' | 'error'>('details')
  const [error, setError] = useState<string | null>(null)
  const leadTraveler = travelers[0] ?? emptyTraveler
  const requiresFreshSearch = !summary

  const price = Number(prebook?.price ?? summary?.price ?? 0)
  const currency = String(prebook?.currency ?? summary?.currency ?? 'USD')
  const formattedPrice = useMemo(() => {
    if (!price) return 'Verified at prebook'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)
  }, [price, currency])

  useEffect(() => {
    setTravelers((current) => {
      if (current.length === passengerCount) return current
      if (current.length > passengerCount) return current.slice(0, passengerCount)
      return [
        ...current,
        ...createTravelers(passengerCount - current.length),
      ]
    })
  }, [passengerCount])

  async function createPrebook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tripId) {
      setError('Create or select a trip before booking this flight.')
      return
    }
    setError(null)
    setStage('processing')

    try {
      const result = await postJson('/api/booking/flights/prebook', {
        offerId,
        contact: {
          firstName: leadTraveler.firstName,
          lastName: leadTraveler.lastName,
          email: leadTraveler.email,
          phoneCountryCode: leadTraveler.phoneCountryCode,
          phoneNumber: leadTraveler.phoneNumber,
        },
        passengers: travelers.map((traveler) => ({
          firstName: traveler.firstName,
          lastName: traveler.lastName,
          birthday: traveler.birthday,
          gender: traveler.gender,
          nationality: traveler.nationality,
          documentType: 'passport',
          documentNumber: traveler.documentNumber,
          documentIssueCountry: traveler.documentIssueCountry,
          documentExpiry: traveler.documentExpiry,
        })),
      })
      await addFlightToTrip(tripId, offerId, result, summary)

      const clientSecret = String(result.client_secret ?? result.clientSecret ?? result.secretKey ?? '')
      const publishableKey = String(result.publishable_key ?? result.publishableKey ?? '')
      if (!clientSecret || !publishableKey) throw new Error('Provider did not return payment setup details.')

      setPrebook(result)
      setStripePromise(loadStripe(publishableKey))
      setStage('payment')
    } catch (err) {
      setError(flightCheckoutErrorMessage(err))
      setStage('error')
    }
  }

  const updateTraveler = (index: number, key: keyof Traveler, value: string) => {
    setTravelers((current) => current.map((traveler, travelerIndex) => (
      travelerIndex === index ? { ...traveler, [key]: value } : traveler
    )))
  }
  const prebookId = String(prebook?.prebook_id ?? prebook?.prebookId ?? '')
  const transactionId = String(prebook?.transaction_id ?? prebook?.transactionId ?? '')
  const clientSecret = String(prebook?.client_secret ?? prebook?.clientSecret ?? prebook?.secretKey ?? '')
  const checkoutState = requiresFreshSearch
    ? 'Fresh fare needed'
    : stage === 'payment'
      ? 'Payment ready'
      : stage === 'processing'
        ? 'Verifying fare'
        : stage === 'error'
          ? 'Review required'
          : 'Traveler details'

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-night md:py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-gray-500">
              Secure flight booking
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-night">
              Book this fare
            </h1>
          </div>
          <Link
            href="/flights"
            className="inline-flex w-fit rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            Back to flight search
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0 space-y-5">
            <div className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">
                    {checkoutState}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-charcoal">
                    {requiresFreshSearch
                      ? `This direct link is missing live fare details. Search current fares before payment. Offer reference ${shortOfferId(offerId)}.`
                      : `LiteAPI verifies the fare during prebook before payment. Offer reference ${shortOfferId(offerId)}.`}
                  </p>
                </div>
                <div className="shrink-0 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-right">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-charcoal">
                    {requiresFreshSearch ? 'Status' : 'Fare'}
                  </p>
                  <p className="text-2xl font-extrabold text-night">
                    {requiresFreshSearch ? 'Search again' : formattedPrice}
                  </p>
                </div>
              </div>
              <FlightFareSummary summary={summary} />
            </div>

            {error && (
              <div className="rounded-2xl bg-coral-50 p-4 text-sm font-medium text-coral-800 ring-1 ring-coral-200">
                {error}
              </div>
            )}

            {trips.length === 0 && (
              <div className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Trip required
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-night">
                  Create a trip before booking this fare
                </h2>
                <p className="mt-2 text-sm leading-6 text-charcoal">
                  Flights must attach to a Baha Buddy trip before payment and provider booking. Create the trip first, then return here to continue checkout.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/trips/new?returnTo=${encodeURIComponent(returnTo ?? `/flights/${offerId}/book`)}&source=flight`}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-brand-700"
                  >
                    <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                    Create trip
                  </Link>
                  <Link
                    href="/flights"
                    className="inline-flex rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                  >
                    Back to flights
                  </Link>
                </div>
              </div>
            )}

            {trips.length > 0 && requiresFreshSearch && (
              <FareRecoveryPanel offerId={offerId} />
            )}

            {trips.length > 0 && !requiresFreshSearch && stage !== 'payment' && (
              <form onSubmit={createPrebook} className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Trip" htmlFor="flight-trip">
                <TravelSearchSelect id="flight-trip" value={tripId} onChange={(e) => setTripId(e.target.value)} required>
                  {trips.length === 0 ? <option value="">No trips found</option> : null}
                  {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
                </TravelSearchSelect>
              </Field>
              <Field label="Email" htmlFor="flight-email">
                <TravelSearchInput id="flight-email" type="email" value={leadTraveler.email} onChange={(e) => updateTraveler(0, 'email', e.target.value)} required />
              </Field>
              <Field label="Phone country code" htmlFor="flight-phone-country-code">
                <TravelSearchInput id="flight-phone-country-code" value={leadTraveler.phoneCountryCode} onChange={(e) => updateTraveler(0, 'phoneCountryCode', e.target.value)} required />
              </Field>
              <Field label="Phone number" htmlFor="flight-phone-number">
                <TravelSearchInput id="flight-phone-number" value={leadTraveler.phoneNumber} onChange={(e) => updateTraveler(0, 'phoneNumber', e.target.value)} required />
              </Field>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-gray-500">
                  Traveler details
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-charcoal">
                  Enter one passport profile for each traveler on this fare.
                </p>
              </div>

              {travelers.map((item, index) => {
                const prefix = passengerCount > 1 ? `Traveler ${index + 1} ` : ''
                const labelSuffix = index === 0 && passengerCount > 1 ? 'Lead passenger' : `Passenger ${index + 1}`
                return (
                  <section key={index} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-base font-extrabold text-night">
                        Traveler {index + 1}
                      </h2>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                        {labelSuffix}
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={`${prefix}first name`} htmlFor={`flight-traveler-${index}-first-name`}>
                        <TravelSearchInput id={`flight-traveler-${index}-first-name`} value={item.firstName} onChange={(e) => updateTraveler(index, 'firstName', e.target.value)} required />
                      </Field>
                      <Field label={`${prefix}last name`} htmlFor={`flight-traveler-${index}-last-name`}>
                        <TravelSearchInput id={`flight-traveler-${index}-last-name`} value={item.lastName} onChange={(e) => updateTraveler(index, 'lastName', e.target.value)} required />
                      </Field>
                      <Field label={`${prefix}date of birth`} htmlFor={`flight-traveler-${index}-birthday`}>
                        <TravelSearchInput id={`flight-traveler-${index}-birthday`} type="date" value={item.birthday} onChange={(e) => updateTraveler(index, 'birthday', e.target.value)} required />
                      </Field>
                      <Field label={`${prefix}gender`} htmlFor={`flight-traveler-${index}-gender`}>
                        <TravelSearchSelect id={`flight-traveler-${index}-gender`} value={item.gender} onChange={(e) => updateTraveler(index, 'gender', e.target.value)}>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                        </TravelSearchSelect>
                      </Field>
                      <Field label={`${prefix}nationality`} htmlFor={`flight-traveler-${index}-nationality`}>
                        <TravelSearchInput id={`flight-traveler-${index}-nationality`} value={item.nationality} onChange={(e) => updateTraveler(index, 'nationality', e.target.value.toUpperCase())} maxLength={2} required />
                      </Field>
                      <Field label={`${prefix}passport number`} htmlFor={`flight-traveler-${index}-passport-number`}>
                        <TravelSearchInput id={`flight-traveler-${index}-passport-number`} value={item.documentNumber} onChange={(e) => updateTraveler(index, 'documentNumber', e.target.value)} required />
                      </Field>
                      <Field label={`${prefix}passport issue country`} htmlFor={`flight-traveler-${index}-passport-issue-country`}>
                        <TravelSearchInput id={`flight-traveler-${index}-passport-issue-country`} value={item.documentIssueCountry} onChange={(e) => updateTraveler(index, 'documentIssueCountry', e.target.value.toUpperCase())} maxLength={2} required />
                      </Field>
                      <Field label={`${prefix}passport expiry`} htmlFor={`flight-traveler-${index}-passport-expiry`}>
                        <TravelSearchInput id={`flight-traveler-${index}-passport-expiry`} type="date" value={item.documentExpiry} onChange={(e) => updateTraveler(index, 'documentExpiry', e.target.value)} required />
                      </Field>
                    </div>
                  </section>
                )
              })}
            </div>
            <button type="submit" disabled={stage === 'processing'} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
              {stage !== 'processing' && <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />}
              {stage === 'processing' ? 'Verifying fare and preparing payment...' : 'Verify fare and continue to payment'}
            </button>
              </form>
            )}

            {!requiresFreshSearch && stage === 'payment' && stripePromise && clientSecret && prebookId && transactionId && (
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
          </div>

          <FlightCheckoutRail
            state={checkoutState}
            hasTrip={trips.length > 0}
            hasSummary={Boolean(summary)}
            stage={stage}
            summary={summary}
          />
        </div>
      </section>
    </main>
  )
}

function FareRecoveryPanel({ offerId }: { offerId: string }) {
  return (
    <section className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
        Fresh fare required
      </p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-night">
        Search again before booking this fare
      </h2>
      <p className="mt-2 text-sm leading-6 text-charcoal">
        Flight offers can expire quickly, and this link does not include the selected fare details Baha Buddy needs before payment. Search current fares, pick the live option again, then continue checkout from that card.
      </p>
      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gray-500">
          Offer reference
        </p>
        <p className="mt-1 break-all text-sm font-bold text-night">
          {shortOfferId(offerId)}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/flights"
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
          Search current fares
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
        >
          Back to dashboard
        </Link>
      </div>
    </section>
  )
}

function FlightCheckoutRail({
  state,
  hasTrip,
  hasSummary,
  stage,
  summary,
}: {
  state: string
  hasTrip: boolean
  hasSummary: boolean
  stage: 'details' | 'payment' | 'processing' | 'error'
  summary?: FlightCheckoutSummary
}) {
  const steps = [
    {
      label: 'Selected fare',
      complete: hasSummary,
      detail: hasSummary ? 'Live search result attached' : 'Choose a current fare first',
    },
    {
      label: 'Trip attached',
      complete: hasTrip,
      detail: hasTrip ? 'Ready to save into My Trip' : 'Create a trip before checkout',
    },
    {
      label: 'Provider prebook',
      complete: stage === 'payment',
      active: stage === 'processing',
      detail: stage === 'payment' ? 'LiteAPI returned payment setup' : 'Runs after traveler details',
    },
    {
      label: 'Payment and confirmation',
      complete: false,
      active: stage === 'payment',
      detail: 'Confirmed only after payment, provider booking, local booking, and trip item reconcile',
    },
  ]

  return (
    <aside
      aria-label="Flight checkout status"
      className="space-y-4 lg:sticky lg:top-24"
    >
      <section className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">
          Checkout status
        </p>
        <h2 className="mt-1 text-lg font-extrabold text-night">
          {state}
        </h2>
        <div className="mt-4 space-y-3">
          {steps.map((step) => (
            <div key={step.label} className="flex gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-extrabold ${
                  step.complete
                    ? 'border-palm-200 bg-palm-50 text-palm-700'
                    : step.active
                      ? 'border-gold-300 bg-gold-50 text-night'
                      : 'border-gray-200 bg-white text-gray-400'
                }`}
                aria-hidden="true"
              >
                {step.complete ? 'OK' : step.active ? 'Now' : ''}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-night">
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs font-semibold leading-5 text-gray-500">
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-baha-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
          Fare snapshot
        </p>
        <dl className="mt-3 space-y-2">
          <RailFact label="Route" value={summary?.route ?? 'Search required'} />
          <RailFact label="Airline" value={summary?.airline ?? 'Current fare needed'} />
          <RailFact label="Travelers" value={summary?.passengers ? `${summary.passengers}` : undefined} />
          <RailFact label="Cabin" value={summary?.fareBrand ?? summary?.cabinClass} />
        </dl>
      </section>

      <section className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
          Confirmation rule
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-charcoal">
          Baha Buddy does not show confirmed until payment, provider booking, the local booking row, and the trip item are all reconciled.
        </p>
      </section>
    </aside>
  )
}

function RailFact({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-gray-200">
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-500">
        {label}
      </dt>
      <dd className="truncate text-right text-xs font-extrabold text-night">
        {value ?? 'Pending'}
      </dd>
    </div>
  )
}

function FlightFareSummary({ summary }: { summary?: FlightCheckoutSummary }) {
  if (!summary) {
    return (
      <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm font-semibold text-night">
          Live fare details are missing from this link.
        </p>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          Return to flight search and choose a current offer before entering traveler or payment details.
        </p>
      </div>
    )
  }

  const title = [
    summary.airline,
    summary.airlineCode ? `(${summary.airlineCode})` : null,
  ].filter(Boolean).join(' ')
  const baggage = baggageSummary(summary)
  const rules = typeof summary.refundable === 'boolean'
    ? summary.refundable ? 'Refundable' : 'Non-refundable'
    : undefined

  const facts = [
    { label: 'Route', value: summary.route },
    { label: 'Depart', value: summary.departure },
    { label: 'Arrive', value: summary.arrival },
    { label: 'Duration', value: summary.duration },
    { label: 'Stops', value: summary.stops },
    { label: 'Cabin', value: summary.fareBrand ?? summary.cabinClass },
    { label: 'Baggage', value: baggage },
    { label: 'Rules', value: rules },
    { label: 'Travelers', value: summary.passengers ? `${summary.passengers} traveler${summary.passengers === 1 ? '' : 's'}` : undefined },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value))

  return (
    <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-charcoal">Selected fare</p>
          <h2 className="mt-1 text-lg font-extrabold text-night">
            {title || 'Flight option'}
          </h2>
        </div>
        {summary.expiration && (
          <p className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-charcoal ring-1 ring-gray-200">
            Verify by {formatExpiration(summary.expiration)}
          </p>
        )}
      </div>

      {facts.length > 0 && (
        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-xl bg-white px-3 py-2 ring-1 ring-gray-200">
              <dt className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-500">{fact.label}</dt>
              <dd className="mt-0.5 truncate text-sm font-bold text-night">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-3 text-xs font-semibold leading-5 text-gray-500">
        This summary comes from the selected search result. Provider prebook must still confirm price and availability before payment.
      </p>
    </div>
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
  setStage: (value: 'details' | 'payment' | 'processing' | 'error') => void
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
        paymentIntentId: paymentIntent.id,
      })
      const bookingId = result.bookingRecordId ?? result.bookingId ?? result.booking_reference ?? prebookId
      const params = new URLSearchParams({
        tripId,
        bookingId: String(bookingId),
      })
      window.location.href = `/flights/${encodeURIComponent(offerId)}/confirmation?${params.toString()}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment succeeded, but provider booking failed. Contact support with your payment reference.')
      setStage('error')
    }
  }

  return (
    <form onSubmit={submitPayment} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button type="submit" disabled={!stripe || !elements} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
        <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
        Pay and confirm flight
      </button>
    </form>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <TravelSearchField label={label} htmlFor={htmlFor}>
      {children}
    </TravelSearchField>
  )
}

async function addFlightToTrip(
  tripId: string,
  offerId: string,
  verification: Record<string, unknown> | null,
  summary?: FlightCheckoutSummary,
) {
  const routeCodes = routeCodesFromSummary(summary)
  const verifiedPrice = numberValue(verification?.price)
  const summaryPrice = numberValue(summary?.price)
  await postJson(`/api/trips/${encodeURIComponent(tripId)}/items`, {
    itemType: 'flight',
    sourceId: offerId,
    sourceType: 'web_flight_booking',
    name: flightItemName(offerId, summary),
    provider: 'liteapi',
    providerOfferId: offerId,
    origin: stringValue(verification?.origin) ?? routeCodes.origin,
    destination: stringValue(verification?.destination) ?? routeCodes.destination,
    departureAt: stringValue(verification?.departure_at),
    arrivalAt: stringValue(verification?.arrival_at),
    airline: stringValue(verification?.airline) ?? summary?.airline,
    price: verifiedPrice ?? summaryPrice,
    currency: String(verification?.currency ?? summary?.currency ?? 'USD'),
    metadata: {
      route: summary?.route,
      duration: summary?.duration,
      stops: summary?.stops,
      cabinClass: summary?.cabinClass,
      fareBrand: summary?.fareBrand,
      refundable: summary?.refundable,
      baggage: baggageSummary(summary),
    },
  })
}

function flightItemName(offerId: string, summary?: FlightCheckoutSummary): string {
  const route = summary?.route
  const airline = summary?.airline
  if (route && airline) return `${airline} ${route}`
  if (route) return `Flight ${route}`
  if (airline) return `${airline} flight`
  return `Flight offer ${shortOfferId(offerId)}`
}

function baggageSummary(summary?: FlightCheckoutSummary): string | undefined {
  if (!summary) return undefined
  const parts: string[] = []
  if (summary.carryOn) parts.push('Carry-on')
  if (summary.checkedBags && summary.checkedBags > 0) {
    parts.push(`${summary.checkedBags} checked`)
  }
  return parts.length > 0 ? parts.join(' + ') : undefined
}

function shortOfferId(value: string): string {
  if (value.length <= 28) return value
  return `${value.slice(0, 18)}...${value.slice(-6)}`
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberValue(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function formatExpiration(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function flightCheckoutErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (/provider request failed with status 400/i.test(message)) {
    return 'This fare could not be verified. It may have expired or changed. Return to flight search and choose a current fare.'
  }
  if (/expired|not found|session/i.test(message)) {
    return 'This fare is no longer available. Return to flight search and choose a current fare.'
  }
  return message || 'Could not start flight checkout.'
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
