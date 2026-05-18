/**
 * stripe-payment Edge Function caller (C.9).
 *
 * Server-side helper that calls the existing `stripe-payment` Supabase
 * Edge Function defined in /Baha-Buddy-V2/supabase/functions/stripe-payment/
 * and reused unchanged. The Edge Function:
 *   1. Authenticates the user via the forwarded Bearer token
 *   2. Creates/retrieves a Stripe customer for them
 *   3. Creates a PaymentIntent with the requested amount + metadata
 *   4. Inserts a `bookings` row in 'pending' status
 *   5. Returns { payment_intent_client_secret, ephemeral_key_secret, customer_id }
 *
 * Run from server components / server actions only. The caller is
 * responsible for forwarding the user's access token (extracted from
 * the Supabase cookie session).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export interface CreatePaymentIntentInput {
  /** Amount in cents (e.g. 22000 = $220.00). Server enforces >= 50. */
  amount: number
  /** Trip the booking belongs to. */
  tripId: string
  /** 'flight' | 'hotel' | 'activity' | 'full_trip'. */
  bookingType: 'flight' | 'hotel' | 'activity' | 'full_trip'
  /** Currency code, default 'usd'. */
  currency?: string
  /** Receipt description. */
  description?: string
  /** Optional Stripe metadata. */
  metadata?: Record<string, string>
  /** User's Supabase access token, from the server-side session. */
  accessToken: string
}

export interface CreatePaymentIntentResult {
  paymentIntentClientSecret: string
  ephemeralKeySecret?: string
  customerId?: string
}

export interface CreatePaymentIntentError {
  error: string
  status?: number
}

export async function createPaymentIntent(
  input: CreatePaymentIntentInput,
): Promise<CreatePaymentIntentResult | CreatePaymentIntentError> {
  if (!SUPABASE_URL) {
    return { error: 'Supabase URL not configured' }
  }
  if (!input.accessToken) {
    return { error: 'Missing access token — user must be signed in', status: 401 }
  }
  if (!input.amount || input.amount < 50) {
    return { error: 'Amount must be at least 50 cents', status: 400 }
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.accessToken}`,
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency ?? 'usd',
        trip_id: input.tripId,
        booking_type: input.bookingType,
        description: input.description ?? `Baha Buddy ${input.bookingType} booking`,
        metadata: input.metadata,
      }),
      // Don't cache POST requests — every call creates a new PaymentIntent
      cache: 'no-store',
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[stripe-payment edge fn]', response.status, text)
      return { error: text || `Edge function returned ${response.status}`, status: response.status }
    }

    const json = (await response.json()) as {
      payment_intent_client_secret?: string
      ephemeral_key_secret?: string
      customer_id?: string
      error?: string
    }

    if (json.error) {
      return { error: json.error, status: response.status }
    }
    if (!json.payment_intent_client_secret) {
      return { error: 'Edge function returned no client secret' }
    }

    return {
      paymentIntentClientSecret: json.payment_intent_client_secret,
      ephemeralKeySecret: json.ephemeral_key_secret,
      customerId: json.customer_id,
    }
  } catch (err) {
    console.error('[createPaymentIntent]', err)
    return { error: err instanceof Error ? err.message : 'Unknown payment setup error' }
  }
}

/** Type guard — narrows the result union to the error branch. */
export function isPaymentIntentError(
  result: CreatePaymentIntentResult | CreatePaymentIntentError,
): result is CreatePaymentIntentError {
  return 'error' in result
}
