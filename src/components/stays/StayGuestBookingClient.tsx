'use client'

import { FormEvent, type ReactNode, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe/client'

type TripOption = { id: string; name: string }

interface Props {
  hotelId: string
  hotelName: string
  rateId: string
  checkin: string
  checkout: string
  adults: number
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

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.currency,
  }).format(props.amountCents / 100)

  async function startPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!tripId) {
      setError('Create or select a trip before booking this stay.')
      return
    }

    try {
      setStage('processing')
      await addStayToTrip(tripId, props)

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
    <main className="min-h-screen bg-sand-50 px-4 py-10 text-night-900">
      <section className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-sand-200">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">Secure hotel booking</p>
          <h1 className="font-serif text-3xl font-bold text-night-950">{props.hotelName}</h1>
          <p className="mt-2 text-sm text-night-600">{props.roomName} · {props.checkin} to {props.checkout} · {formattedAmount}</p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl bg-coral-50 p-4 text-sm font-medium text-coral-800 ring-1 ring-coral-200">
            {error}
          </div>
        )}

        {stage !== 'payment' && (
          <form onSubmit={startPayment} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-sand-200">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Trip">
                <select value={tripId} onChange={(e) => setTripId(e.target.value)} className="input" required>
                  {props.trips.length === 0 ? <option value="">No trips found</option> : null}
                  {props.trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
                </select>
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
              </Field>
              <Field label="First name">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" required />
              </Field>
              <Field label="Last name">
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" required />
              </Field>
              <Field label="Phone">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
              </Field>
            </div>

            <button
              type="submit"
              disabled={stage === 'processing' || props.trips.length === 0}
              className="mt-6 w-full rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
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
              setError={setError}
              setStage={setStage}
            />
          </Elements>
        )}
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
  setError,
  setStage,
}: Props & {
  tripId: string
  guest: { firstName: string; lastName: string; email: string; phone: string }
  prebookId: string
  paymentIntentId: string
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

      const bookingId = result.bookingRecordId ?? result.bookingId ?? paymentIntentId
      window.location.href = `/trip/${encodeURIComponent(tripId)}?booking=${encodeURIComponent(String(bookingId))}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment succeeded, but provider booking failed. Contact support with your payment reference.')
      setStage('error')
    }
  }

  return (
    <form onSubmit={submitPayment} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-sand-200">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        disabled={!stripe || !elements}
        className="mt-6 w-full rounded-full bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
      >
        Pay and confirm hotel
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

async function addStayToTrip(tripId: string, props: Props) {
  await postJson(`/api/trips/${encodeURIComponent(tripId)}/items`, {
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
    guests: props.adults,
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
