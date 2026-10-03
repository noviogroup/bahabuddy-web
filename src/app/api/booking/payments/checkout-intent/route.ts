import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPaymentIntent, isPaymentIntentError } from '@/lib/stripe/edge-function'
import { retrievePaymentIntent } from '@/lib/stripe/payment-intents'

/** PaymentIntent states that can still be paid and so may be reused. */
const REUSABLE_STATUSES = new Set(['requires_payment_method', 'requires_confirmation', 'requires_action'])

/**
 * Creates (or reuses) the PaymentIntent for the full-trip checkout at
 * /dashboard/checkout. Called on an explicit user action, never during page
 * render, and priced from the stored trip estimate rather than the URL.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })

  let body: { tripId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const tripId = typeof body.tripId === 'string' ? body.tripId.trim() : ''
  if (!tripId) return NextResponse.json({ error: 'tripId is required.' }, { status: 400 })

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, budget_estimate')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!trip) return NextResponse.json({ error: 'Trip not found.' }, { status: 404 })

  const amountCents = fullTripAmountCents((trip as { budget_estimate?: number | null }).budget_estimate)
  if (amountCents === null) {
    return NextResponse.json({ error: 'This trip does not have a bookable total yet.' }, { status: 409 })
  }

  const reusable = await findReusableIntent(createAdminClient() ?? supabase, user.id, tripId, amountCents)
  if (reusable) {
    return NextResponse.json({ clientSecret: reusable, amountCents, currency: 'usd', reused: true })
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return NextResponse.json({ error: 'Missing session token.' }, { status: 401 })

  const result = await createPaymentIntent({
    amount: amountCents,
    tripId,
    bookingType: 'full_trip',
    description: String((trip as { name?: string | null }).name ?? 'Baha Buddy trip').slice(0, 200),
    metadata: { source_surface: 'web' },
    accessToken: session.access_token,
  })
  if (isPaymentIntentError(result)) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 502 })
  }

  return NextResponse.json({ clientSecret: result.paymentIntentClientSecret, amountCents, currency: 'usd', reused: false })
}

function fullTripAmountCents(budgetEstimate: unknown): number | null {
  const n = typeof budgetEstimate === 'number' ? budgetEstimate : Number(budgetEstimate)
  if (!Number.isFinite(n) || n < 1) return null
  const cents = Math.round(n * 100)
  return cents >= 50 ? cents : null
}

type BookingsReader = {
  from: (table: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}

async function findReusableIntent(client: BookingsReader, userId: string, tripId: string, amountCents: number): Promise<string | null> {
  try {
    const { data, error } = await client
      .from('bookings')
      .select('stripe_payment_intent_id')
      .eq('user_id', userId)
      .eq('trip_id', tripId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)
    if (error || !Array.isArray(data)) return null

    for (const row of data as Array<{ stripe_payment_intent_id?: string | null }>) {
      const id = row.stripe_payment_intent_id
      if (!id) continue
      const retrieved = await retrievePaymentIntent(id)
      if (!retrieved.ok) continue
      const pi = retrieved.paymentIntent
      if (
        REUSABLE_STATUSES.has(pi.status)
        && pi.amount === amountCents
        && pi.currency?.toLowerCase() === 'usd'
        && pi.metadata?.booking_type === 'full_trip'
        && pi.metadata?.user_id === userId
        && typeof pi.client_secret === 'string'
      ) {
        return pi.client_secret
      }
    }
  } catch (error) {
    console.error('[checkout-intent] reuse lookup failed', error)
  }
  return null
}
