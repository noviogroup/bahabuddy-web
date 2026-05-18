import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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
 *   - succeeded: green celebration with link back to trip
 *   - processing: yellow "still working on it" message
 *   - failed/other: coral error message
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

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      {outcome === 'succeeded' && (
        <SuccessPanel booking={booking} trip={trip} />
      )}
      {outcome === 'processing' && (
        <ProcessingPanel trip={trip} />
      )}
      {outcome === 'failed' && (
        <FailedPanel trip={trip} />
      )}
      {outcome === 'unknown' && (
        <UnknownPanel trip={trip} paymentIntentId={paymentIntentId} />
      )}
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

  if (redirectStatus === 'succeeded') {
    // Webhook hasn't caught up yet — show optimistic success but
    // with a softer affordance.
    return bookingStatus === 'pending' ? 'succeeded' : 'processing'
  }
  if (redirectStatus === 'processing') return 'processing'
  if (redirectStatus === 'requires_payment_method') return 'failed'
  return 'unknown'
}

// ── Panels ───────────────────────────────────────────────────────────

function SuccessPanel({
  booking,
  trip,
}: {
  booking: BookingRow | null
  trip: TripRow | null
}) {
  return (
    <div className="bg-white rounded-baha-lg border border-palm-200 shadow-card overflow-hidden">
      <div className="bg-gradient-to-br from-palm-500 to-palm-600 px-6 py-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur mb-4">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">You&apos;re booked</h1>
        <p className="text-palm-50 text-sm mt-2">
          {trip ? `Your ${trip.name} is locked in.` : 'Your booking is confirmed.'}
        </p>
      </div>

      <div className="p-6 sm:p-8 space-y-5">
        {booking && (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Booking type</dt>
              <dd className="font-medium text-night capitalize">{(booking.booking_type ?? '—').replace('_', ' ')}</dd>
            </div>
            {booking.amount != null && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Amount paid</dt>
                <dd className="font-semibold text-night">
                  {formatAmount(booking.amount, booking.currency ?? 'USD')}
                </dd>
              </div>
            )}
            {booking.paid_at && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Paid at</dt>
                <dd className="font-medium text-night">{fmtTime(booking.paid_at)}</dd>
              </div>
            )}
            {booking.stripe_payment_intent_id && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Reference</dt>
                <dd className="font-mono text-xs text-gray-700 truncate ml-2 max-w-[60%] text-right">
                  {booking.stripe_payment_intent_id}
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {trip && (
            <Link
              href={`/trip/${trip.id}`}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-3 rounded-full transition-colors shadow-card"
            >
              View trip
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          )}
          <Link
            href="/profile/bookings"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-5 py-3 rounded-full transition-colors border border-gray-200"
          >
            All bookings
          </Link>
        </div>
      </div>
    </div>
  )
}

function ProcessingPanel({ trip }: { trip: TripRow | null }) {
  return (
    <div className="bg-white rounded-baha-lg border border-gold-200 shadow-card overflow-hidden">
      <div className="bg-gradient-to-br from-gold-400 to-gold-500 px-6 py-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur mb-4">
          <svg className="w-9 h-9 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Almost there</h1>
        <p className="text-gold-50 text-sm mt-2">
          Stripe is finishing up. We&apos;ll email you the moment it&apos;s done — usually under a minute.
        </p>
      </div>

      <div className="p-6 sm:p-8 text-center">
        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          You can safely close this page. Your booking will appear in your trip and in <span className="font-semibold text-night">All bookings</span> once Stripe confirms.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {trip && (
            <Link
              href={`/trip/${trip.id}`}
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-3 rounded-full transition-colors shadow-card"
            >
              Back to trip
            </Link>
          )}
          <Link
            href="/profile/bookings"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-5 py-3 rounded-full transition-colors border border-gray-200"
          >
            All bookings
          </Link>
        </div>
      </div>
    </div>
  )
}

function FailedPanel({ trip }: { trip: TripRow | null }) {
  return (
    <div className="bg-white rounded-baha-lg border border-coral-200 shadow-card overflow-hidden">
      <div className="bg-gradient-to-br from-coral-500 to-coral-600 px-6 py-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur mb-4">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Payment didn&apos;t go through</h1>
        <p className="text-coral-50 text-sm mt-2">
          Don&apos;t worry — no charge was made.
        </p>
      </div>

      <div className="p-6 sm:p-8 text-center">
        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          Try again with a different card, or contact your bank if the issue persists.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {trip && (
            <Link
              href={`/trip/${trip.id}`}
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-3 rounded-full transition-colors shadow-card"
            >
              Back to trip
            </Link>
          )}
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-5 py-3 rounded-full transition-colors border border-gray-200"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

function UnknownPanel({
  trip,
  paymentIntentId,
}: {
  trip: TripRow | null
  paymentIntentId: string
}) {
  return (
    <div className="bg-white rounded-baha-lg border border-gray-200 shadow-card p-8 sm:p-10 text-center">
      <h1 className="text-xl font-bold text-night mb-2">Checking on your booking…</h1>
      <p className="text-sm text-gray-500 leading-relaxed">
        We can&apos;t find the booking record yet. This usually means Stripe is still processing —
        try refreshing in a few seconds, or check All bookings.
      </p>
      {paymentIntentId && (
        <p className="mt-4 text-xs text-gray-400 font-mono">{paymentIntentId}</p>
      )}
      <div className="mt-6 flex items-center justify-center gap-3">
        {trip && (
          <Link
            href={`/trip/${trip.id}`}
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            ← Back to trip
          </Link>
        )}
        <Link
          href="/profile/bookings"
          className="text-sm font-semibold text-gray-500 hover:text-night transition-colors"
        >
          All bookings
        </Link>
      </div>
    </div>
  )
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
