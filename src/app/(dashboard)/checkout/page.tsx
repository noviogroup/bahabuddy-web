import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import type { Trip } from '@/types/database'
import { createPaymentIntent, isPaymentIntentError } from '@/lib/stripe/edge-function'
import { isStripeConfigured, getStripe } from '@/lib/stripe/client'
import CheckoutForm from '@/components/checkout/CheckoutForm'
import TrackView from '@/components/TrackView'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Checkout | Baha Buddy',
  robots: { index: false },
}

/**
 * /dashboard/checkout — Stripe checkout (Phase C.9).
 *
 * Query params:
 *   - trip_id      (required): the trip being booked
 *   - amount       (required): payment amount in cents
 *   - type         (required): 'flight' | 'hotel' | 'activity' | 'full_trip'
 *   - description  (optional): receipt description
 *
 * Flow:
 *   1. Auth check (handled by the (dashboard) route group layout)
 *   2. Verify the trip belongs to this user
 *   3. Call the stripe-payment Edge Function → clientSecret
 *   4. Render <CheckoutForm> with Stripe PaymentElement
 *   5. On submit, Stripe redirects to /dashboard/checkout/success
 *
 * Security caveat (matching mobile behavior): the amount is trusted from
 * the URL. A more robust design would compute the amount server-side
 * from a stored offer/quote. Phase 2 hardening.
 *
 * Graceful degradation:
 *   - If Stripe isn't configured → render setup-needed screen
 *   - If the Edge Function fails → render error screen with link back to trip
 *   - If params are invalid → render error screen
 */

const VALID_TYPES = new Set(['flight', 'hotel', 'activity', 'full_trip'])

interface SearchParams {
  trip_id?: string
  amount?: string
  type?: string
  description?: string
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  // ── 0. Stripe configured? ─────────────────────────────────────────
  if (!isStripeConfigured) {
    return <StripeNotConfigured />
  }

  // ── 1. Parse + validate params ────────────────────────────────────
  const tripId = searchParams.trip_id?.trim() ?? ''
  const amountCents = Number(searchParams.amount ?? 0)
  const bookingType = (searchParams.type ?? '').trim()
  const description = searchParams.description?.trim() || undefined

  if (!tripId) {
    return <CheckoutError title="Missing trip" body="No trip was specified for checkout." />
  }
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    return <CheckoutError title="Invalid amount" body={`The amount must be at least 50 cents (got ${amountCents}).`} />
  }
  if (!VALID_TYPES.has(bookingType)) {
    return (
      <CheckoutError
        title="Invalid booking type"
        body={`Expected one of: flight, hotel, activity, full_trip. Got "${bookingType}".`}
      />
    )
  }

  // ── 2. Auth + ownership ───────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, user_id, status, hero_image_url, date_start, date_end')
    .eq('id', tripId)
    .single()

  if (!trip) notFound()
  if (trip.user_id !== user.id) notFound()

  const tripRecord = trip as Pick<Trip, 'id' | 'name' | 'user_id' | 'status' | 'hero_image_url' | 'date_start' | 'date_end'>

  // ── 3. Build return URL ───────────────────────────────────────────
  const hdrs = headers()
  const origin = inferOrigin(hdrs)
  const returnUrl = `${origin}/dashboard/checkout/success?trip_id=${encodeURIComponent(tripId)}`

  // ── 4. Get user's access token from session for Edge Function call ─
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    // Session exists but no token — bounce to login. Rare edge case.
    redirect('/login')
  }

  // ── 5. Create PaymentIntent via the Edge Function ─────────────────
  const intentResult = await createPaymentIntent({
    amount: amountCents,
    tripId,
    bookingType: bookingType as 'flight' | 'hotel' | 'activity' | 'full_trip',
    description,
    accessToken: session.access_token,
  })

  if (isPaymentIntentError(intentResult)) {
    return (
      <CheckoutError
        title="Could not start checkout"
        body={intentResult.error}
        tripId={tripId}
      />
    )
  }

  // ── 6. Render the form ────────────────────────────────────────────
  const stripePromise = getStripe()

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <TrackView event="booking_initiated" props={{ trip_id: tripId, booking_type: bookingType, amount_cents: amountCents }} />
      {/* Back link */}
      <div className="mb-6">
        <Link
          href={`/trip/${tripId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-night transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to {tripRecord.name}
        </Link>
      </div>

      {/* Order summary */}
      <section className="relative mb-8 overflow-hidden rounded-baha-lg border border-gray-200 bg-white p-6 shadow-sm">
        <svg className="absolute -right-8 -top-8 h-36 w-36 text-gray-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16l7-3V7a2 2 0 0 1 4 0v6l7 3v2l-7-2v3l2 1.5V22l-4-1-4 1v-1.5L10 19v-3l-7 2v-2Z" />
        </svg>
        <p className="text-xs font-bold uppercase tracking-widest text-charcoal">Checkout</p>
        <h1 className="mt-1 text-2xl font-extrabold text-night sm:text-3xl">{tripRecord.name}</h1>
        {(tripRecord.date_start || tripRecord.date_end) && (
          <p className="mt-1 text-sm text-charcoal">
            {fmtRange(tripRecord.date_start, tripRecord.date_end)}
          </p>
        )}
        <div className="mt-6 flex items-end justify-between border-t border-gray-200 pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-charcoal">{labelFor(bookingType)}</p>
            <p className="mt-1 text-sm text-charcoal">{description ?? 'Baha Buddy booking'}</p>
          </div>
          <p className="text-3xl font-extrabold text-night sm:text-4xl">{formatAmount(amountCents)}</p>
        </div>
      </section>

      {/* Payment form */}
      <CheckoutForm
        stripePromise={stripePromise}
        clientSecret={intentResult.paymentIntentClientSecret}
        amountCents={amountCents}
        currency="usd"
        tripName={tripRecord.name}
        returnUrl={returnUrl}
      />

      {/* Trust badges */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          PCI-DSS secured by Stripe
        </span>
        <span>•</span>
        <span>Card never touches Baha Buddy servers</span>
      </div>
    </main>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return ''
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (start && end) return `${fmt(start)} → ${fmt(end)}`
  return fmt((start ?? end) as string)
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function labelFor(type: string): string {
  switch (type) {
    case 'flight':    return 'Flight booking'
    case 'hotel':     return 'Hotel booking'
    case 'activity':  return 'Activity booking'
    case 'full_trip': return 'Full trip booking'
    default:          return 'Booking'
  }
}

/** Build the absolute origin from the incoming request headers. */
function inferOrigin(hdrs: Headers): string {
  const forwardedHost = hdrs.get('x-forwarded-host') ?? hdrs.get('host')
  const forwardedProto = hdrs.get('x-forwarded-proto') ?? 'https'
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`
  // Fallback — primarily for local dev
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

// ── Error states ─────────────────────────────────────────────────────

function StripeNotConfigured() {
  return (
    <main className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-baha-lg border border-gray-200 p-8 sm:p-10 shadow-soft text-center">
        <h1 className="text-xl font-bold text-night mb-2">Payments aren&apos;t set up yet</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          The web app is running without a Stripe key. Set{' '}
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{' '}
          in your environment to enable checkout.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-night transition-colors hover:text-gray-700"
        >
          ← Back to dashboard
        </Link>
      </div>
    </main>
  )
}

function CheckoutError({
  title,
  body,
  tripId,
}: {
  title: string
  body: string
  tripId?: string
}) {
  return (
    <main className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-baha-lg border border-coral-200 p-8 sm:p-10 shadow-soft text-center">
        <svg className="mx-auto mb-4 h-12 w-12 text-coral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 4.3 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
        </svg>
        <h1 className="text-xl font-bold text-night mb-2">{title}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {tripId && (
            <Link
              href={`/trip/${tripId}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-night transition-colors hover:text-gray-700"
            >
              ← Back to trip
            </Link>
          )}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-night transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
