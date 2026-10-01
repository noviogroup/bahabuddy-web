/**
 * Server-only Stripe PaymentIntent helpers.
 *
 * The browser's claim that a payment succeeded is never trusted: before any
 * provider booking is charged to the company account, the server retrieves the
 * PaymentIntent from Stripe with the secret key and checks it against the
 * server-priced quote.
 */

export type StripePaymentIntent = {
  id: string
  status: string
  amount: number
  amount_received?: number | null
  currency: string
  client_secret?: string | null
  metadata?: Record<string, string> | null
}

export type RetrievePaymentIntentResult =
  | { ok: true; paymentIntent: StripePaymentIntent }
  | { ok: false; reason: 'not_configured' | 'not_found' | 'stripe_error' }

export async function retrievePaymentIntent(paymentIntentId: string): Promise<RetrievePaymentIntentResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? ''
  if (!secretKey) return { ok: false, reason: 'not_configured' }
  if (!/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) return { ok: false, reason: 'not_found' }

  try {
    const response = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: 'no-store',
    })
    if (response.status === 404) return { ok: false, reason: 'not_found' }
    if (!response.ok) {
      console.error('[stripe] payment intent retrieve failed', response.status, await response.text().catch(() => ''))
      return { ok: false, reason: 'stripe_error' }
    }
    const json = await response.json() as StripePaymentIntent
    if (!json || typeof json.id !== 'string') return { ok: false, reason: 'stripe_error' }
    return { ok: true, paymentIntent: json }
  } catch (error) {
    console.error('[stripe] payment intent retrieve threw', error)
    return { ok: false, reason: 'stripe_error' }
  }
}

export type PaymentIntentExpectation = {
  userId: string
  tripId: string
  prebookId: string
  /** Server-priced amount in minor units. The PaymentIntent must cover at least this. */
  minimumAmountCents: number
  currency: string
}

export type PaymentVerification =
  | { ok: true; amountCents: number; currency: string }
  | { ok: false; status: number; code: string; error: string }

export function verifyPaymentIntentForBooking(
  paymentIntent: StripePaymentIntent,
  expected: PaymentIntentExpectation,
): PaymentVerification {
  if (paymentIntent.status !== 'succeeded') {
    return {
      ok: false,
      status: 402,
      code: 'payment_not_completed',
      error: 'Your payment has not completed yet, so the booking was not placed. No booking has been made.',
    }
  }

  const metadata = paymentIntent.metadata ?? {}
  // stripe-payment always stamps user_id/trip_id server-side; any PI without
  // them was not created by our booking flow.
  if (metadata.user_id !== expected.userId || metadata.trip_id !== expected.tripId) {
    return mismatch()
  }
  const metadataPrebookId = metadata.liteapi_prebook_id || metadata.prebook_id
  if (metadataPrebookId && metadataPrebookId !== expected.prebookId) {
    return mismatch()
  }

  if (String(paymentIntent.currency ?? '').toLowerCase() !== expected.currency.toLowerCase()) {
    return mismatch()
  }

  const received = typeof paymentIntent.amount_received === 'number'
    ? paymentIntent.amount_received
    : paymentIntent.amount
  if (!Number.isFinite(received) || received < expected.minimumAmountCents) {
    return mismatch()
  }

  return { ok: true, amountCents: received, currency: paymentIntent.currency.toLowerCase() }
}

function mismatch(): PaymentVerification {
  return {
    ok: false,
    status: 409,
    code: 'payment_mismatch',
    error: 'This payment does not match the stay you selected, so the booking was not placed. Please contact support@bahabuddy.com with your payment reference.',
  }
}
