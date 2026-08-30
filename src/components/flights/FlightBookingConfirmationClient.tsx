'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import { airlineCheckInLink } from '@/lib/airline-check-in'

type BookingReturn = {
  tripId: string
  tripItemId: string | null
  bookingId: string
  provider: string
  providerReference: string | null
  airline: string | null
  departureAt: string | null
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
  const [referenceCopyStatus, setReferenceCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

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
    if (booking.paymentStatus === 'paid' && booking.providerStatus === 'failed') return 'Payment received, booking needs support'
    if (booking.paymentStatus === 'paid' && booking.providerStatus === 'pending') return 'Payment received, booking pending'
    if (booking.paymentStatus === 'failed') return 'Payment failed'
    return 'Booking status needs review'
  }, [booking])

  const bodyCopy = useMemo(() => {
    if (!booking) return 'We are checking your payment and booking status.'
    if (booking.reconciled) return 'Your payment and flight booking are confirmed.'
    if (booking.paymentStatus === 'paid' && booking.providerStatus === 'failed') {
      return 'Do not book again. Support needs to review this booking against your payment reference.'
    }
    if (booking.paymentStatus === 'paid' && booking.providerStatus === 'pending') {
      return 'The payment is recorded, but the flight booking is still pending.'
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
  const checkInLink = airlineCheckInLink(booking?.airline)

  async function copyBookingReference() {
    if (!booking?.providerReference) return

    try {
      await navigator.clipboard.writeText(booking.providerReference)
      setReferenceCopyStatus('copied')
    } catch {
      setReferenceCopyStatus('error')
    }
  }

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
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              {primaryLabel}
            </Link>
            <Link
              href="/profile/bookings"
              className="inline-flex rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
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
            label="Airline"
            value={booking?.providerStatus ?? 'Checking'}
            tone={booking?.providerStatus === 'confirmed' ? 'good' : booking?.providerStatus === 'failed' ? 'bad' : 'warn'}
          />
          <StatusChip
            label="Booking"
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
              {booking.reconciled && (
                <p className="mb-5 rounded-baha-xl border border-palm-200 bg-palm-50 p-4 text-sm font-semibold leading-6 text-palm-800">
                  We sent your receipt, itinerary, and booking reference to your email.
                </p>
              )}

              {booking.providerReference && (
                <div className="mb-5 rounded-baha-xl border border-brand-200 bg-brand-50 p-5">
                  <p className="text-xs font-bold uppercase text-brand-700">
                    Your booking reference / PNR
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="break-all text-2xl font-bold text-night">
                      {booking.providerReference}
                    </p>
                    <button
                      type="button"
                      onClick={copyBookingReference}
                      aria-label={`Copy booking reference ${booking.providerReference}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                    >
                      {referenceCopyStatus === 'copied'
                        ? 'Copied'
                        : referenceCopyStatus === 'error'
                          ? 'Copy failed'
                          : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-charcoal">
                    Use this PNR to check in online or manage your flight with the airline.
                  </p>
                  <span role="status" aria-live="polite" className="sr-only">
                    {referenceCopyStatus === 'copied'
                      ? 'Booking reference copied to clipboard'
                      : referenceCopyStatus === 'error'
                        ? 'Booking reference could not be copied'
                        : ''}
                  </span>
                </div>
              )}

              <div className="mb-5 grid gap-3 rounded-baha-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
                <StatusField label="Travel partner" value={providerLabel(booking.provider)} />
                <StatusField label="Amount" value={amountLabel ?? 'Pending'} />
                <StatusField label="Fare ID" value={shortOfferId} title={offerId} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {booking.demo && <StatusField label="Demo booking" value="No payment needed" />}
                <StatusField label="Payment" value={booking.paymentStatus} tone={booking.paymentStatus === 'paid' ? 'good' : 'warn'} />
                <StatusField label="Airline" value={booking.providerStatus} tone={booking.providerStatus === 'confirmed' ? 'good' : booking.providerStatus === 'failed' ? 'bad' : 'warn'} />
                <StatusField label="Booking reference / PNR" value={booking.providerReference ?? 'Pending'} />
                <StatusField label="Booking" value={booking.reconciled ? 'Confirmed' : 'Pending'} tone={booking.reconciled ? 'good' : 'warn'} />
              </div>

              <div className="mt-5 rounded-baha-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase text-gray-500">
                  Confirmation
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-charcoal">
                  Baha Buddy shows confirmed only after payment and flight booking are both complete.
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Next step</p>
            <h2 className="mt-3 text-xl font-bold text-night">
              {booking?.reconciled ? 'Add this flight to your trip review.' : 'Do not duplicate the booking yet.'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-charcoal">
              {booking?.reconciled
                ? 'Open the trip to review traveler details, timing, and the rest of the plan around this flight.'
                : 'Check the status here before purchasing again.'}
            </p>
            <Link
              href={primaryHref}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              {booking?.demo ? 'Open dashboard' : 'Open trip review'}
            </Link>
          </div>

          {booking?.reconciled && (
            <div className="rounded-baha-xl border border-brand-100 bg-brand-50 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-baha-lg bg-white text-brand-700 ring-1 ring-brand-100" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-bold uppercase text-brand-700">Before you fly</p>
                  <h2 className="mt-1 text-lg font-bold text-night">Check in 24 hours before departure</h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-charcoal">
                Set a reminder for when online check-in opens. Keep your airline reference ready so you can save your boarding pass.
              </p>
              <a
                href={checkInLink.href}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                Open {booking.airline?.trim() || 'airline'} check-in
              </a>
              {checkInLink.isAirlineLink && (
                <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">
                  Opens the airline app when installed, or its check-in page.
                </p>
              )}
            </div>
          )}

          <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Support details</p>
            <div className="mt-4 space-y-3 text-sm text-charcoal">
              <SupportFact label="Booking" value={booking?.bookingId ?? bookingId} />
              <SupportFact label="Trip" value={booking?.tripId ?? tripId} />
              <SupportFact label="Booking reference / PNR" value={booking?.providerReference ?? 'Pending'} />
            </div>
            <Link
              href="/profile/bookings"
              className="mt-5 inline-flex w-full justify-center rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
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
    airline: 'Bahamasair',
    departureAt: null,
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
      <p className="text-xs font-bold uppercase text-gray-500">
        {label}
      </p>
      <p className={`mt-1 break-words text-sm font-bold ${valueClass}`} title={title}>
        {value}
      </p>
    </div>
  )
}

function StatusChip({
  label,
  value,
}: {
  label: string
  value: string
  tone: 'good' | 'warn' | 'bad'
}) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1">
      {label}: {value}
    </span>
  )
}

function SupportFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-baha-lg bg-gray-50 p-3 ring-1 ring-gray-200">
      <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
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
  if (normalized.includes('liteapi')) return provider.includes('flight') ? 'Flight partner' : 'Travel partner'
  return provider
}

function shortenIdentifier(value: string): string {
  if (value.length <= 28) return value
  return `${value.slice(0, 10)}...${value.slice(-8)}`
}
