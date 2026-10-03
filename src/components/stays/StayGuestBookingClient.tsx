'use client'

import Link from 'next/link'
import { FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe/client'
import {
  TravelSearchField,
  TravelSearchInput,
  TravelSearchSelect,
} from '@/components/marketplace/TravelSearchFields'

type TripOption = { id: string; name: string }

interface Props {
  hotelId: string
  hotelName: string
  rateId: string
  checkin: string
  checkout: string
  adults: number
  childrenCount?: number
  requestedRooms?: number
  roomName: string
  amountCents: number
  currency: string
  trips: TripOption[]
}

// 'paid_needs_support' is terminal: the card was charged, so the checkout
// forms must never be shown again for this rate.
type Stage = 'details' | 'payment' | 'processing' | 'error' | 'paid_needs_support'

type PaidSupportState = { paymentReference: string; message: string }

export default function StayGuestBookingClient(props: Props) {
  const [tripId, setTripId] = useState(props.trips[0]?.id ?? '')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [stage, setStage] = useState<Stage>('details')
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [prebookId, setPrebookId] = useState<string | null>(null)
  const [tripItemId, setTripItemId] = useState<string | null>(null)
  const [quotedAmountCents, setQuotedAmountCents] = useState<number | null>(null)
  const [quotedCurrency, setQuotedCurrency] = useState<string | null>(null)
  const [paidSupport, setPaidSupport] = useState<PaidSupportState | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = readPaidSupport(props.rateId)
    if (stored) {
      setPaidSupport(stored)
      setStage('paid_needs_support')
    }
  }, [props.rateId])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  function markPaidNeedsSupport(state: PaidSupportState) {
    writePaidSupport(props.rateId, state)
    setPaidSupport(state)
    setError(null)
    setStage('paid_needs_support')
  }

  const displayCurrency = quotedCurrency ?? props.currency
  const formattedAmount = formatMoney((quotedAmountCents ?? props.amountCents) / 100, displayCurrency)
  const priceChanged = quotedAmountCents !== null && quotedAmountCents !== props.amountCents
  const childrenCount = Math.max(0, props.childrenCount ?? 0)
  const requestedRooms = Math.max(1, props.requestedRooms ?? 1)
  const totalTravelers = props.adults + childrenCount
  const hasTrip = props.trips.length > 0
  const checkoutState = stage === 'payment'
    ? 'Payment ready'
    : stage === 'processing'
      ? 'Preparing checkout'
      : stage === 'error'
        ? 'Review required'
        : stage === 'paid_needs_support'
          ? 'Support follow-up'
          : 'Guest details'
  const returnTo = bookingReturnPath(props)

  async function startPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!tripId) {
      setError('Create or select a trip before booking this stay.')
      return
    }

    try {
      setStage('processing')
      const tripItem = await addStayToTrip(tripId, props)
      setTripItemId(String(tripItem.tripItemId ?? ''))

      const prebook = await postJson('/api/booking/hotels/prebook', {
        rateId: props.rateId,
        hotelId: props.hotelId,
        checkin: props.checkin,
        checkout: props.checkout,
        currency: props.currency,
      })
      const nextPrebookId = String(prebook.prebookId ?? '')
      if (!nextPrebookId) throw new Error('Hotel prebook did not return a prebook ID.')

      // The server prices the payment from this prebook; the browser never sends an amount.
      const intent = await postJson('/api/booking/payments/intent', {
        tripId,
        prebookId: nextPrebookId,
        bookingType: 'hotel',
        description: `${props.hotelName} · ${props.roomName}`,
        metadata: {
          source_surface: 'web',
          provider: 'liteapi',
          hotel_id: props.hotelId,
          rate_id: props.rateId,
        },
      })

      const serverAmount = Number(intent.amountCents)
      if (Number.isFinite(serverAmount) && serverAmount > 0) setQuotedAmountCents(serverAmount)
      if (typeof intent.currency === 'string' && intent.currency) setQuotedCurrency(intent.currency.toUpperCase())
      setPrebookId(nextPrebookId)
      setPaymentIntentId(String(intent.paymentIntentId ?? ''))
      setClientSecret(String(intent.clientSecret ?? ''))
      setStage('payment')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start hotel checkout.')
      setStage('error')
    }
  }

  const guest = { firstName, lastName, email, phone }

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-night md:py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">
              Secure hotel booking
            </p>
            <h1 className="mt-1 text-3xl font-bold text-night">
              {props.hotelName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-charcoal">
              {props.roomName} · {props.checkin} to {props.checkout} · {totalTravelers} {totalTravelers === 1 ? 'traveler' : 'travelers'} · {requestedRooms} {requestedRooms === 1 ? 'room' : 'rooms'} · {formattedAmount}
            </p>
          </div>
          <Link
            href={`/stays/${encodeURIComponent(props.hotelId)}`}
            className="inline-flex w-fit rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            Back to stay details
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0 space-y-5">
            <section className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-brand-700">
                    {checkoutState}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-charcoal">
                    Confirm the room rate, pay securely, and keep this stay with your trip.
                  </p>
                </div>
                <div className="shrink-0 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-right">
                  <p className="text-xs font-bold uppercase text-charcoal">
                    Stay total
                  </p>
                  <p className="text-2xl font-bold text-night">
                    {formattedAmount}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <StayFact label="Dates" value={`${props.checkin} to ${props.checkout}`} />
                <StayFact label="Travelers" value={`${totalTravelers}`} />
                <StayFact label="Rooms" value={`${requestedRooms}`} />
              </div>
            </section>

            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className={error ? 'rounded-2xl bg-coral-50 p-4 text-sm font-medium text-coral-800 ring-1 ring-coral-200 focus:outline-none' : 'sr-only'}
            >
              {error}
            </div>

            {stage === 'paid_needs_support' && paidSupport && (
              <section role="status" className="rounded-baha-lg border border-gold-300 bg-gold-50 p-5 shadow-sm md:p-6">
                <p className="text-xs font-bold uppercase text-charcoal">
                  Payment received
                </p>
                <h2 className="mt-2 text-2xl font-bold text-night">
                  Our team is finishing this booking with you
                </h2>
                <p className="mt-2 text-sm leading-6 text-charcoal">
                  {paidSupport.message}
                </p>
                <p className="mt-3 text-sm font-semibold text-night">
                  Payment reference: <span className="font-mono text-xs">{paidSupport.paymentReference}</span>
                </p>
                <p className="mt-2 text-sm leading-6 text-charcoal">
                  Please do not pay again. Email{' '}
                  <a className="font-bold text-brand-700 underline" href={`mailto:support@bahabuddy.com?subject=${encodeURIComponent(`Hotel booking ${paidSupport.paymentReference}`)}`}>support@bahabuddy.com</a>{' '}
                  with this reference and we will confirm your stay or arrange a refund.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={tripId ? `/trip/${encodeURIComponent(tripId)}` : '/dashboard'}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
                  >
                    View my trip
                  </Link>
                </div>
              </section>
            )}

            {!hasTrip && stage !== 'payment' && stage !== 'paid_needs_support' && (
              <section className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                <p className="text-sm font-semibold uppercase text-gray-500">
                  Trip required
                </p>
                <h2 className="mt-2 text-2xl font-bold text-night">
                  Create a trip before booking this stay
                </h2>
                <p className="mt-2 text-sm leading-6 text-charcoal">
                  Create the trip first, then return here to continue checkout.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Trip" htmlFor="stay-trip-empty">
                    <TravelSearchSelect id="stay-trip-empty" value="" disabled>
                      <option value="">No trips found</option>
                    </TravelSearchSelect>
                  </Field>
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm transition-colors disabled:opacity-60"
                >
                  Continue to pay {formattedAmount}
                </button>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/trips/new?returnTo=${encodeURIComponent(returnTo)}&source=stay`}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
                  >
                    Create trip
                  </Link>
                  <Link
                    href={`/stays/${encodeURIComponent(props.hotelId)}`}
                    className="inline-flex rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                  >
                    Back to stay
                  </Link>
                </div>
              </section>
            )}

            {hasTrip && (stage === 'details' || stage === 'processing' || stage === 'error') && (
              <form onSubmit={startPayment} className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Trip" htmlFor="stay-trip">
                    <TravelSearchSelect id="stay-trip" value={tripId} onChange={(e) => setTripId(e.target.value)} required>
                      {props.trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
                    </TravelSearchSelect>
                  </Field>
                  <Field label="Email" htmlFor="stay-email">
                    <TravelSearchInput id="stay-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </Field>
                  <Field label="First name" htmlFor="stay-first-name">
                    <TravelSearchInput id="stay-first-name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </Field>
                  <Field label="Last name" htmlFor="stay-last-name">
                    <TravelSearchInput id="stay-last-name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </Field>
                  <Field label="Phone" htmlFor="stay-phone">
                    <TravelSearchInput id="stay-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                </div>

                <button
                  type="submit"
                  disabled={stage === 'processing'}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
                >

                  {stage === 'processing' ? 'Preparing secure checkout...' : `Continue to pay ${formattedAmount}`}
                </button>
              </form>
            )}

            {stage === 'payment' && priceChanged && (
              <div role="status" className="rounded-2xl border border-gold-300 bg-gold-50 p-4 text-sm font-semibold text-night">
                The hotel updated this rate. Your confirmed total is {formattedAmount} (was {formatMoney(props.amountCents / 100, props.currency)}).
              </div>
            )}

            {stage === 'payment' && clientSecret && prebookId && paymentIntentId && (
              <Elements stripe={getStripe()} options={{ clientSecret }}>
                <HotelPaymentForm
                  {...props}
                  tripId={tripId}
                  guest={guest}
                  prebookId={prebookId}
                  paymentIntentId={paymentIntentId}
                  tripItemId={tripItemId}
                  formattedAmount={formattedAmount}
                  setError={setError}
                  onPaidNeedsSupport={markPaidNeedsSupport}
                />
              </Elements>
            )}
          </div>

          <HotelCheckoutRail
            props={props}
            state={checkoutState}
            hasTrip={hasTrip}
            stage={stage}
            totalTravelers={totalTravelers}
            requestedRooms={requestedRooms}
            formattedAmount={formattedAmount}
          />
        </div>
      </section>
    </main>
  )
}

function HotelPaymentForm({
  hotelId,
  hotelName,
  rateId,
  checkin,
  checkout,
  roomName,
  tripId,
  guest,
  prebookId,
  paymentIntentId,
  tripItemId,
  formattedAmount,
  setError,
  onPaidNeedsSupport,
}: Props & {
  tripId: string
  guest: { firstName: string; lastName: string; email: string; phone: string }
  prebookId: string
  paymentIntentId: string
  tripItemId: string | null
  formattedAmount: string
  setError: (value: string | null) => void
  onPaidNeedsSupport: (state: PaidSupportState) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  // Local state only: the parent must keep <Elements>/<PaymentElement> mounted
  // while Stripe confirms the payment (3DS, redirects, wallet sheets).
  const [submitting, setSubmitting] = useState(false)

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe || !elements || submitting) return

    setSubmitting(true)
    setError(null)

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (stripeError || paymentIntent?.status !== 'succeeded') {
      setError(stripeError?.message ?? 'Payment was not completed.')
      setSubmitting(false)
      return
    }

    try {
      const result = await postJson('/api/booking/hotels/book', {
        tripId,
        tripItemId,
        prebookId,
        paymentIntentId,
        holder: guest,
        guests: [guest],
        hotelId,
        hotelName,
        rateId,
        checkin,
        checkout,
        roomName,
      })

      ensureLocalBookingSaved(result)
      const bookingId = result.bookingRecordId ?? result.bookingId ?? paymentIntentId
      window.location.href = `/trip/${encodeURIComponent(tripId)}?booking=${encodeURIComponent(String(bookingId))}`
    } catch (err) {
      setSubmitting(false)
      onPaidNeedsSupport({
        paymentReference: paymentIntentId,
        message: err instanceof Error && err.message
          ? err.message
          : 'Payment succeeded, but the booking needs support. Contact support with your payment reference.',
      })
    }
  }

  return (
    <form onSubmit={submitPayment} className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        aria-describedby="stay-pay-total"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? 'Confirming payment...' : 'Pay and confirm hotel'}
      </button>
      <p id="stay-pay-total" className="mt-2 text-center text-xs font-semibold text-gray-500">
        Total charged: {formattedAmount}
      </p>
    </form>
  )
}

function HotelCheckoutRail({
  props,
  state,
  hasTrip,
  stage,
  totalTravelers,
  requestedRooms,
  formattedAmount,
}: {
  props: Props
  state: string
  hasTrip: boolean
  stage: Stage
  totalTravelers: number
  requestedRooms: number
  formattedAmount: string
}) {
  const steps = [
    {
      label: 'Selected room',
      complete: true,
      detail: `${props.roomName} is attached to this checkout`,
    },
    {
      label: 'Trip attached',
      complete: hasTrip,
      detail: hasTrip ? 'Ready to save into My Trip' : 'Create a trip before checkout',
    },
    {
      label: 'Room rate',
      complete: stage === 'payment',
      active: stage === 'processing',
      detail: stage === 'payment' ? 'Rate ready for payment' : 'Runs after guest details',
    },
    {
      label: 'Payment and confirmation',
      complete: false,
      active: stage === 'payment',
      detail: 'Confirmed after payment and booking checks finish',
    },
  ]

  return (
    <aside aria-label="Hotel checkout status" className="space-y-4 lg:sticky lg:top-24">
      <section className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase text-gray-500">
          Checkout status
        </p>
        <h2 className="mt-1 text-lg font-bold text-night">
          {state}
        </h2>
        <div className="mt-4 space-y-3">
          {steps.map((step) => (
            <div key={step.label} className="flex gap-3">
              <span
                className={`mt-0.5 flex h-6 min-w-10 shrink-0 items-center justify-center rounded-md border px-1.5 text-xs font-bold ${
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
                <p className="text-sm font-bold text-night">
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
        <p className="text-xs font-bold uppercase text-gray-500">
          Stay snapshot
        </p>
        <dl className="mt-3 space-y-2">
          <RailFact label="Stay" value={props.hotelName} />
          <RailFact label="Room" value={props.roomName} />
          <RailFact label="Guests" value={`${totalTravelers}`} />
          <RailFact label="Rooms" value={`${requestedRooms}`} />
          <RailFact label="Total" value={formattedAmount} />
        </dl>
      </section>

      <section className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase text-gray-500">
          Confirmation
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-charcoal">
          Baha Buddy shows confirmed only after payment and booking checks finish.
        </p>
      </section>
    </aside>
  )
}

function StayFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
      <p className="text-xs font-bold uppercase text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-bold text-night">
        {value}
      </p>
    </div>
  )
}

function RailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-gray-200">
      <dt className="text-xs font-bold uppercase text-gray-500">
        {label}
      </dt>
      <dd className="truncate text-right text-xs font-bold text-night">
        {value}
      </dd>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <TravelSearchField label={label} htmlFor={htmlFor}>
      {children}
    </TravelSearchField>
  )
}

async function addStayToTrip(tripId: string, props: Props) {
  return postJson(`/api/trips/${encodeURIComponent(tripId)}/items`, {
    itemType: 'hotel',
    sourceId: props.hotelId,
    sourceType: 'web_stay_booking',
    name: props.hotelName,
    date: props.checkin,
    endDate: props.checkout,
    provider: 'liteapi',
    providerHotelId: props.hotelId,
    providerRateId: props.rateId,
    price: props.amountCents / 100,
    currency: props.currency,
    guests: props.adults + (props.childrenCount ?? 0),
    metadata: {
      adults: props.adults,
      children: props.childrenCount ?? 0,
      rooms: props.requestedRooms ?? 1,
    },
  })
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

function ensureLocalBookingSaved(result: Record<string, unknown>) {
  if (
    result.localStatus === 'failed'
    || !result.bookingRecordId
    || !result.tripItemId
  ) {
    throw new Error('Payment succeeded, but this booking needs support before it can be shown as confirmed. Contact support with your payment reference.')
  }
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

const PAID_SUPPORT_KEY_PREFIX = 'bb:stay-paid-needs-support:'

function readPaidSupport(rateId: string): PaidSupportState | null {
  try {
    const raw = window.sessionStorage.getItem(`${PAID_SUPPORT_KEY_PREFIX}${rateId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PaidSupportState>
    return typeof parsed.paymentReference === 'string' && typeof parsed.message === 'string'
      ? { paymentReference: parsed.paymentReference, message: parsed.message }
      : null
  } catch {
    return null
  }
}

function writePaidSupport(rateId: string, state: PaidSupportState) {
  try {
    window.sessionStorage.setItem(`${PAID_SUPPORT_KEY_PREFIX}${rateId}`, JSON.stringify(state))
  } catch {
    // Storage can be unavailable (private mode); the in-memory stage still blocks re-payment.
  }
}

function bookingReturnPath(props: Props): string {
  const params = new URLSearchParams({
    rate_id: props.rateId,
    checkin: props.checkin,
    checkout: props.checkout,
    adults: String(props.adults),
    children: String(Math.max(0, props.childrenCount ?? 0)),
    rooms: String(Math.max(1, props.requestedRooms ?? 1)),
    room: props.roomName,
    amount: String(props.amountCents),
    currency: props.currency,
    hotel_name: props.hotelName,
  })

  return `/stays/${encodeURIComponent(props.hotelId)}/guests?${params.toString()}`
}
