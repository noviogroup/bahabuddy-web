import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TrackView from '@/components/TrackView'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Payment confirmed | Baha Buddy',
  robots: { index: false },
}

/**
 * /dashboard/checkout/success — Post-payment confirmation page (C.9).
 *
 * Stripe redirects here with these query params:
 *   - payment_intent         — the PaymentIntent ID
 *   - payment_intent_client_secret
 *   - redirect_status        — 'succeeded' | 'processing' | 'requires_payment_method'
 *   - trip_id                — passed through via return_url
 *
 * The actual booking status update is handled by the stripe-webhook
 * Edge Function (server-to-server, more reliable than client-side
 * confirmation). This page reads the booking row from Supabase to show
 * the user what happened.
 *
 * Three rendering paths:
 *   - succeeded: confirmed booking row with link back to trip
 *   - processing: payment received but booking row still reconciling
 *   - failed/other: no confirmed booking state
 */

interface SearchParams {
  payment_intent?: string
  payment_intent_client_secret?: string
  redirect_status?: string
  trip_id?: string
}

type Outcome = 'succeeded' | 'processing' | 'failed' | 'unknown'

interface BookingRow {
  id: string
  trip_id: string
  booking_type: string
  status: string | null
  amount: number | null
  currency: string | null
  paid_at: string | null
  stripe_payment_intent_id: string | null
}

interface TripRow {
  id: string
  name: string
  hero_image_url: string | null
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const paymentIntentId = searchParams.payment_intent?.trim() ?? ''
  const tripId = searchParams.trip_id?.trim() ?? ''
  const redirectStatus = (searchParams.redirect_status ?? '').trim()

  // Look up the booking row by payment_intent_id. The webhook may not
  // have updated it yet if the user lands here before the webhook fires.
  // The DB status is the source of truth though — read it.
  let booking: BookingRow | null = null
  let trip: TripRow | null = null

  if (paymentIntentId) {
    const { data } = await supabase
      .from('bookings')
      .select('id, trip_id, booking_type, status, amount, currency, paid_at, stripe_payment_intent_id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('user_id', user.id)
      .single()
    if (data) booking = data as BookingRow
  }

  // Fetch trip — prefer the trip_id from the booking row, fall back to
  // the URL param.
  const effectiveTripId = booking?.trip_id ?? tripId
  if (effectiveTripId) {
    const { data } = await supabase
      .from('trips')
      .select('id, name, hero_image_url')
      .eq('id', effectiveTripId)
      .eq('user_id', user.id)
      .single()
    if (data) trip = data as TripRow
  }

  const outcome = deriveOutcome(redirectStatus, booking?.status ?? null)
  const copy = outcomeCopy(outcome, trip)

  return (
    <main className="min-h-screen bg-white text-night">
      {outcome === 'succeeded' && (
        <TrackView event="booking_completed" props={{ trip_id: effectiveTripId, booking_type: booking?.booking_type, amount_cents: booking?.amount }} />
      )}

      <CompactPageHeader
        eyebrow="Booking payment"
        title={copy.title}
        subtitle={copy.subtitle}
        crumbs={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: trip ? `/trip/${trip.id}` : '/trip', label: 'Trips' },
          { label: 'Payment status' },
        ]}
        actions={(
          <>
            {trip && (
              <Link
                href={`/trip/${trip.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                View trip
              </Link>
            )}
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
          <StatusChip label="Payment" value={copy.statusLabel} tone={copy.tone} />
          <StatusChip label="Booking" value={booking?.status ?? 'Checking'} tone={bookingTone(booking?.status ?? null, outcome)} />
          <StatusChip label="Trip" value={trip?.name ?? 'Pending'} tone={trip ? 'good' : 'warn'} />
        </div>
      </CompactPageHeader>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <OutcomeDetails outcome={outcome} booking={booking} trip={trip} paymentIntentId={paymentIntentId} />
        <aside className="space-y-4">
          <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="mb-4 block h-2 w-10 rounded-full bg-gold-400" aria-hidden="true" />
            <p className="text-xs font-bold uppercase text-gray-500">Next step</p>
            <h2 className="mt-3 text-xl font-bold text-night">{copy.nextTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-charcoal">{copy.nextBody}</p>
            <div className="mt-5 flex flex-col gap-3">
              {trip && (
                <Link
                  href={`/trip/${trip.id}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                >
                  <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                  Open trip review
                </Link>
              )}
              <Link
                href="/profile/bookings"
                className="inline-flex w-full justify-center rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
              >
                Review all bookings
              </Link>
            </div>
          </div>

          <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Support details</p>
            <div className="mt-4 space-y-3 text-sm text-charcoal">
              <StatusFact label="Payment reference" value={paymentIntentId || 'Not available'} />
              <StatusFact label="Booking" value={booking?.id ?? 'Pending'} />
              <StatusFact label="Trip" value={effectiveTripId || 'Pending'} />
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}

function deriveOutcome(redirectStatus: string, bookingStatus: string | null): Outcome {
  // The DB is the source of truth (webhook updates it), but if the user
  // landed here faster than the webhook fired, redirect_status from
  // Stripe is a reasonable optimistic signal.
  if (bookingStatus === 'confirmed') return 'succeeded'
  if (bookingStatus === 'failed') return 'failed'
  if (bookingStatus === 'cancelled') return 'failed'

  if (redirectStatus === 'succeeded') return 'processing'
  if (redirectStatus === 'processing') return 'processing'
  if (redirectStatus === 'requires_payment_method') return 'failed'
  return 'unknown'
}

// ── Panels ───────────────────────────────────────────────────────────

function OutcomeDetails({
  outcome,
  booking,
  trip,
  paymentIntentId,
}: {
  outcome: Outcome
  booking: BookingRow | null
  trip: TripRow | null
  paymentIntentId: string
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-baha-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase text-gray-500">Booking status</p>
        <h2 className="mt-3 text-2xl font-bold text-night">{statusHeadline(outcome)}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-charcoal">{statusBody(outcome)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatusFact label="Outcome" value={outcomeCopy(outcome, trip).statusLabel} />
        <StatusFact label="Trip" value={trip?.name ?? 'Pending'} />
        <StatusFact label="Booking type" value={booking ? booking.booking_type.replaceAll('_', ' ') : 'Pending'} />
        <StatusFact label="Booking" value={booking?.status ?? 'Checking'} />
        {booking?.amount != null && (
          <StatusFact label="Amount paid" value={formatAmount(booking.amount, booking.currency ?? 'USD')} />
        )}
        {booking?.paid_at && (
          <StatusFact label="Paid at" value={fmtTime(booking.paid_at)} />
        )}
        <StatusFact label="Payment reference" value={(booking?.stripe_payment_intent_id ?? paymentIntentId) || 'Pending'} />
      </div>

      <div className="rounded-baha-xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-xs font-bold uppercase text-gray-500">Confirmation</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-charcoal">
          Baha Buddy shows confirmed only after payment and booking checks finish. Avoid duplicate purchases and check All bookings if the status is still processing.
        </p>
      </div>
    </div>
  )
}

function outcomeCopy(outcome: Outcome, trip: TripRow | null) {
  if (outcome === 'succeeded') {
    return {
      title: 'Payment confirmed',
      subtitle: trip ? `${trip.name} is ready for trip review.` : 'Your payment and booking are confirmed.',
      statusLabel: 'Confirmed',
      tone: 'good' as const,
      nextTitle: 'Review the booking in your trip.',
      nextBody: 'Open the trip to check booking details, timing, and anything else that needs to be planned around it.',
    }
  }
  if (outcome === 'processing') {
    return {
      title: 'Payment received, booking still checking',
      subtitle: 'Payment returned successfully, but the booking is not confirmed yet.',
      statusLabel: 'Checking',
      tone: 'warn' as const,
      nextTitle: 'Wait for the booking to confirm.',
      nextBody: 'Do not purchase again while this is checking. Check All bookings or return to the trip after the booking updates.',
    }
  }
  if (outcome === 'failed') {
    return {
      title: 'Payment did not go through',
      subtitle: 'No confirmed booking was created from this checkout attempt. Try again only after reviewing the payment status.',
      statusLabel: 'Failed',
      tone: 'bad' as const,
      nextTitle: 'Return to the trip before retrying.',
      nextBody: 'Check the trip or bookings page before trying another payment.',
    }
  }
  return {
    title: 'Checking your booking status',
    subtitle: 'Baha Buddy cannot find a confirmed booking yet. This can happen while payment and booking checks finish.',
    statusLabel: 'Checking',
    tone: 'warn' as const,
    nextTitle: 'Check bookings before taking action.',
    nextBody: 'Check All bookings before making another purchase.',
  }
}

function statusHeadline(outcome: Outcome): string {
  switch (outcome) {
    case 'succeeded':
      return 'Booking confirmed.'
    case 'processing':
      return 'Payment status is still catching up.'
    case 'failed':
      return 'No confirmed booking was created.'
    default:
      return 'Booking status is not available yet.'
  }
}

function statusBody(outcome: Outcome): string {
  switch (outcome) {
    case 'succeeded':
      return 'Your booking is confirmed. Open the trip to review the saved details.'
    case 'processing':
      return 'Payment returned successfully, but the booking is still checking. Wait before treating it as confirmed.'
    case 'failed':
      return 'The checkout did not complete successfully. No confirmed booking should be shown for this attempt.'
    default:
      return 'Refresh later or open All bookings to check the latest status.'
  }
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

function StatusFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-night">{value}</p>
    </div>
  )
}

function bookingTone(status: string | null, outcome: Outcome): 'good' | 'warn' | 'bad' {
  if (status === 'confirmed') return 'good'
  if (status === 'failed' || status === 'cancelled' || outcome === 'failed') return 'bad'
  return 'warn'
}

// ── Formatters ───────────────────────────────────────────────────────

function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(value)
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
