import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentIntent, isPaymentIntentError } from '@/lib/stripe/edge-function'
import { getHotelPrebookQuote } from '@/lib/travel-booking/hotel-prebook'
import { getProviderErrorResponse } from '@/lib/travel-booking/provider'

/** Client metadata keys that may be forwarded to Stripe. Identity keys are set server-side. */
const ALLOWED_METADATA_KEYS = ['source_surface', 'provider', 'hotel_id', 'rate_id'] as const

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  }

  let body: {
    tripId?: string
    prebookId?: string
    bookingType?: string
    description?: string
    metadata?: Record<string, unknown>
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const tripId = typeof body.tripId === 'string' ? body.tripId.trim() : ''
  const prebookId = typeof body.prebookId === 'string' ? body.prebookId.trim() : ''
  const bookingType = body.bookingType ?? 'hotel'

  // Only hotel stays are paid through this route; the amount is always priced
  // from the provider prebook on the server, never from the request body.
  if (bookingType !== 'hotel') {
    return NextResponse.json({ error: 'Unsupported booking type.' }, { status: 400 })
  }
  if (!tripId || !prebookId) {
    return NextResponse.json({ error: 'tripId and prebookId are required.' }, { status: 400 })
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!trip) return NextResponse.json({ error: 'Trip not found.' }, { status: 404 })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return NextResponse.json({ error: 'Missing session token.' }, { status: 401 })
  }

  let quote: Awaited<ReturnType<typeof getHotelPrebookQuote>>
  try {
    quote = await getHotelPrebookQuote(prebookId)
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json({ error: response.error }, { status: response.status })
  }
  if (!quote || quote.amountCents < 50) {
    console.error('[payments/intent] prebook quote unavailable', { prebookId })
    return NextResponse.json({
      error: 'We could not confirm the price for this stay. Please search again.',
    }, { status: 409 })
  }

  const metadata: Record<string, string> = {}
  const clientMetadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {}
  for (const key of ALLOWED_METADATA_KEYS) {
    const value = clientMetadata[key]
    if (typeof value === 'string' && value.trim()) metadata[key] = value.trim().slice(0, 200)
  }
  metadata.source_surface = metadata.source_surface ?? 'web'
  // stripe-payment keys its booking attempt (and Stripe idempotency) on this id.
  metadata.liteapi_prebook_id = prebookId

  const result = await createPaymentIntent({
    amount: quote.amountCents,
    tripId,
    bookingType: 'hotel',
    currency: quote.currency,
    description: typeof body.description === 'string' ? body.description.slice(0, 200) : undefined,
    metadata,
    accessToken: session.access_token,
  })

  if (isPaymentIntentError(result)) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 502 })
  }

  return NextResponse.json({
    clientSecret: result.paymentIntentClientSecret,
    paymentIntentId: result.paymentIntentId ?? result.paymentIntentClientSecret.split('_secret_')[0],
    bookingAttemptId: result.bookingAttemptId ?? null,
    amountCents: quote.amountCents,
    currency: quote.currency.toUpperCase(),
  })
}
