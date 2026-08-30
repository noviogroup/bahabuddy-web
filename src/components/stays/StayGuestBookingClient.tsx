'use client'

import Link from 'next/link'
import { FormEvent, type ReactNode, useState } from 'react'
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

type Stage = 'details' | 'payment' | 'processing' | 'error'

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

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.currency,
  }).format(props.amountCents / 100)
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

      const intent = await postJson('/api/booking/payments/intent', {
        amount: props.amountCents,
        tripId,
        bookingType: 'hotel',
        currency: props.currency.toLowerCase(),
        description: `${props.hotelName} · ${props.roomName}`,
        metadata: {
          source_surface: 'web',
          provider: 'liteapi',
          hotel_id: props.hotelId,
          rate_id: props.rateId,
        },
      })

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

            {error && (
              <div className="rounded-2xl bg-coral-50 p-4 text-sm font-medium text-coral-800 ring-1 ring-coral-200">
                {error}
              </div>
            )}

            {!hasTrip && stage !== 'payment' && (
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

            {hasTrip && stage !== 'payment' && (
              <form onSubmit={startPayment} className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Trip" htmlFor="stay-trip">
                    <TravelSearchSelect id="stay-trip" value={tripId} onChange={(e) => setTripId(e.target.value)} required>
                      {props.trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
                    </TravelSearchSelect>
                  </Field>
                  <Field label="Email" htmlFor="stay-email">
                    <TravelSearchInput id="stay-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </Field>
                  <Field label="First name" htmlFor="stay-first-name">
                    <TravelSearchInput id="stay-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </Field>
                  <Field label="Last name" htmlFor="stay-last-name">
                    <TravelSearchInput id="stay-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </Field>
                  <Field label="Phone" htmlFor="stay-phone">
                    <TravelSearchInput id="stay-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
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

            {stage === 'payment' && clientSecret && prebookId && paymentIntentId && (
              <Elements stripe={getStripe()} options={{ clientSecret }}>
                <HotelPaymentForm
                  {...props}
                  tripId={tripId}
                  guest={guest}
                  prebookId={prebookId}
                  paymentIntentId={paymentIntentId}
                  tripItemId={tripItemId}
                  setError={setError}
                  setStage={setStage}
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
  amountCents,
  currency,
  roomName,
  tripId,
  guest,
  prebookId,
  paymentIntentId,
  tripItemId,
  setError,
  setStage,
}: Props & {
  tripId: string
  guest: { firstName: string; lastName: string; email: string; phone: string }
  prebookId: string
  paymentIntentId: string
  tripItemId: string | null
  setError: (value: string | null) => void
  setStage: (value: Stage) => void
}) {
  const stripe = useStripe()
  const elements = useElements()

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe || !elements) return

    setStage('processing')
    setError(null)

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (stripeError || paymentIntent?.status !== 'succeeded') {
      setError(stripeError?.message ?? 'Payment was not completed.')
      setStage('payment')
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
        amount: amountCents / 100,
        currency,
      })

      ensureLocalBookingSaved(result)
      const bookingId = result.bookingRecordId ?? result.bookingId ?? paymentIntentId
      window.location.href = `/trip/${encodeURIComponent(tripId)}?booking=${encodeURIComponent(String(bookingId))}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment succeeded, but the booking needs support. Contact support with your payment reference.')
      setStage('error')
    }
  }

  return (
    <form onSubmit={submitPayment} className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        disabled={!stripe || !elements}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        Pay and confirm hotel
      </button>
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
