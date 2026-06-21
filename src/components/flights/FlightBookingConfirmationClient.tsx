'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'

type BookingReturn = {
  tripId: string
  tripItemId: string | null
  bookingId: string
  provider: string
  providerReference: string | null
  paymentStatus: string
  providerStatus: string
  amount: number | null
  currency: string
  sourceSurface: string
  reconciled: boolean
  demo?: boolean
}

type Status = 'loading' | 'ready' | 'error'
export type DemoBookingState = 'confirmed' | 'pending' | 'provider_failed'

export default function FlightBookingConfirmationClient({
  offerId,
  tripId,
  bookingId,
  demoState,
}: {
  offerId: string
  tripId: string
  bookingId: string
  demoState?: DemoBookingState
}) {
  const [status, setStatus] = useState<Status>(demoState ? 'ready' : 'loading')
  const [booking, setBooking] = useState<BookingReturn | null>(() => (
    demoState ? demoBookingReturn(demoState, tripId, bookingId) : null
  ))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (demoState) {
      setBooking(demoBookingReturn(demoState, tripId, bookingId))
      setStatus('ready')
      return undefined
    }

    let cancelled = false

    async function loadBooking() {
      try {
        const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/bookings/${encodeURIComponent(bookingId)}`, {
          cache: 'no-store',
        })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error ?? 'Unable to load booking status.')
        if (!cancelled) {
          setBooking(body as BookingReturn)
          setStatus('ready')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load booking status.')
          setStatus('error')
        }
      }
    }

    void loadBooking()
    return () => {
      cancelled = true
    }
  }, [tripId, bookingId, demoState])

  const headline = useMemo(() => {
    if (!booking) return 'Checking your flight booking'
    if (booking.reconciled) return 'Flight booking confirmed'
    if (booking.paymentStatus === 'paid' && booking.providerStatus === 'failed') return 'Payment received, provider booking failed'
    if (booking.paymentStatus === 'paid' && booking.providerStatus === 'pending') return 'Payment received, booking pending'
    if (booking.paymentStatus === 'failed') return 'Payment failed'
    return 'Booking status needs review'
  }, [booking])

  const bodyCopy = useMemo(() => {
    if (!booking) return 'We are checking payment, provider booking, and your trip record before showing a final status.'
    if (booking.reconciled) return 'Your payment, provider booking, local booking record, and trip item are reconciled.'
    if (booking.paymentStatus === 'paid' && booking.providerStatus === 'failed') {
      return 'Do not book again. Support needs to review the provider failure against your payment reference.'
    }
    if (booking.paymentStatus === 'paid' && booking.providerStatus === 'pending') {
      return 'The payment is recorded, but the provider booking is still pending. We will not mark this confirmed yet.'
    }
    return 'This booking is not fully confirmed. Review the status details below or contact support before making a duplicate purchase.'
  }, [booking])

  const amountLabel = booking?.amount != null
    ? formatMoney(booking.amount, booking.currency)
    : null
  const shortOfferId = shortenIdentifier(offerId)
  const primaryHref = booking?.demo
    ? '/dashboard'
    : `/trip/${encodeURIComponent(tripId)}?booking=${encodeURIComponent(bookingId)}`
  const primaryLabel = booking?.demo ? 'Dashboard' : 'View trip'
  const reconciliationLabel = booking?.reconciled
    ? 'Reconciled'
    : booking
      ? 'Needs review'
      : 'Checking'

  return (
    <main className="min-h-screen bg-white text-night">
      <CompactPageHeader
        eyebrow="Flight confirmation"
        title={headline}
        subtitle={bodyCopy}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/flights', label: 'Flights' },
          { label: 'Confirmation' },
        ]}
        actions={(
          <>
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-extrabold text-white transition-colors hover:bg-brand-700"
            >
              <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
              {primaryLabel}
            </Link>
            <Link
              href="/profile/bookings"
              className="inline-flex rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              All bookings
            </Link>
          </>
        )}
      >
        <div className="flex flex-wrap gap-2 text-xs font-bold text-charcoal">
          <StatusChip
            label="Payment"
            value={booking?.paymentStatus ?? 'Checking'}
            tone={booking?.paymentStatus === 'paid' ? 'good' : 'warn'}
          />
          <StatusChip
            label="Provider"
            value={booking?.providerStatus ?? 'Checking'}
            tone={booking?.providerStatus === 'confirmed' ? 'good' : booking?.providerStatus === 'failed' ? 'bad' : 'warn'}
          />
          <StatusChip
            label="Trip record"
            value={reconciliationLabel}
            tone={booking?.reconciled ? 'good' : 'warn'}
          />
        </div>
      </CompactPageHeader>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {status === 'loading' && (
            <div className="rounded-baha-xl border border-gray-200 bg-white p-5 text-sm font-semibold text-charcoal shadow-sm">
              Loading booking status...
            </div>
          )}

          {status === 'error' && (
            <div role="alert" className="rounded-baha-xl border border-coral-200 bg-coral-50 p-5 text-sm font-semibold text-coral-800">
              {error}
            </div>
          )}

          {booking && (
            <div className="rounded-baha-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 grid gap-3 rounded-baha-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
                <StatusField label="Provider" value={providerLabel(booking.provider)} />
                <StatusField label="Amount" value={amountLabel ?? 'Pending'} />
                <StatusField label="Offer ID" value={shortOfferId} title={offerId} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {booking.demo && <StatusField label="Demo state" value="Non-payment fixture" />}
                <StatusField label="Payment" value={booking.paymentStatus} tone={booking.paymentStatus === 'paid' ? 'good' : 'warn'} />
                <StatusField label="Provider" value={booking.providerStatus} tone={booking.providerStatus === 'confirmed' ? 'good' : booking.providerStatus === 'failed' ? 'bad' : 'warn'} />
                <StatusField label="Provider reference" value={booking.providerReference ?? 'Pending'} />
                <StatusField label="Booking record" value={booking.bookingId} />
                <StatusField label="Trip item" value={booking.tripItemId ?? 'Pending'} />
                <StatusField label="Source" value={booking.sourceSurface} />
              </div>

              <div className="mt-5 rounded-baha-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
                  Confirmation rule
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-charcoal">
                  Baha Buddy only shows confirmed when payment, provider booking, local booking record, and trip item all reconcile.
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="mb-4 block h-2 w-10 rounded-full bg-gold-400" aria-hidden="true" />
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">Next step</p>
            <h2 className="mt-3 text-xl font-extrabold text-night">
              {booking?.reconciled ? 'Add this flight to your trip review.' : 'Do not duplicate the booking yet.'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-charcoal">
              {booking?.reconciled
                ? 'Open the trip to review traveler details, timing, and the rest of the plan around this flight.'
                : 'Use the status fields here before purchasing again. Payment, provider, and trip-item state must match before we call it confirmed.'}
            </p>
            <Link
              href={primaryHref}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-brand-700"
            >
              <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
              {booking?.demo ? 'Open dashboard' : 'Open trip review'}
            </Link>
          </div>

          <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">Support context</p>
            <div className="mt-4 space-y-3 text-sm text-charcoal">
              <SupportFact label="Booking" value={booking?.bookingId ?? bookingId} />
              <SupportFact label="Trip" value={booking?.tripId ?? tripId} />
              <SupportFact label="Provider reference" value={booking?.providerReference ?? 'Pending'} />
            </div>
            <Link
              href="/profile/bookings"
              className="mt-5 inline-flex w-full justify-center rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Review all bookings
            </Link>
          </div>
        </aside>
      </section>
    </main>
  )
}

function demoBookingReturn(state: DemoBookingState, tripId: string, bookingId: string): BookingReturn {
  const base = {
    tripId,
    tripItemId: state === 'provider_failed' ? null : 'demo-flight-item',
    bookingId,
    provider: 'flight_liteapi',
    amount: 690,
    currency: 'usd',
    sourceSurface: 'web',
    demo: true,
  }

  if (state === 'confirmed') {
    return {
      ...base,
      providerReference: 'DEMO123',
      paymentStatus: 'paid',
      providerStatus: 'confirmed',
      reconciled: true,
    }
  }

  if (state === 'provider_failed') {
    return {
      ...base,
      providerReference: null,
      paymentStatus: 'paid',
      providerStatus: 'failed',
      reconciled: false,
    }
  }

  return {
    ...base,
    providerReference: null,
    paymentStatus: 'paid',
    providerStatus: 'pending',
    reconciled: false,
  }
}

function StatusField({
  label,
  value,
  title,
  tone = 'default',
}: {
  label: string
  value: string
  title?: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
}) {
  const valueClass = tone === 'good'
    ? 'text-palm-700'
    : tone === 'warn'
      ? 'text-charcoal'
      : tone === 'bad'
        ? 'text-coral-800'
        : 'text-night'

  return (
    <div className="rounded-baha-lg border border-gray-200 bg-white p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>
      <p className={`mt-1 break-words text-sm font-extrabold ${valueClass}`} title={title}>
        {value}
      </p>
    </div>
  )
}

function StatusChip({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'good' | 'warn' | 'bad'
}) {
  const dotClass = tone === 'good'
    ? 'bg-palm-500'
    : tone === 'bad'
      ? 'bg-coral-500'
      : 'bg-gold-400'

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
      {label}: {value}
    </span>
  )
}

function SupportFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-baha-lg bg-gray-50 p-3 ring-1 ring-gray-200">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className="mt-1 break-all font-bold text-night">{value}</p>
    </div>
  )
}

function formatMoney(amount: number, currency: string): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: (currency || 'USD').toUpperCase(),
    maximumFractionDigits: 0,
  })
}

function providerLabel(provider: string): string {
  const normalized = provider.toLowerCase()
  if (normalized.includes('liteapi')) return provider.includes('flight') ? 'LiteAPI flights' : 'LiteAPI'
  if (normalized.includes('duffel')) return 'Duffel'
  return provider
}

function shortenIdentifier(value: string): string {
  if (value.length <= 28) return value
  return `${value.slice(0, 10)}...${value.slice(-8)}`
}
