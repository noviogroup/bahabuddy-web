import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentIntent, isPaymentIntentError } from '@/lib/stripe/edge-function'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  }

  let body: {
    amount?: number
    tripId?: string
    bookingType?: 'flight' | 'hotel' | 'activity' | 'full_trip'
    currency?: string
    description?: string
    metadata?: Record<string, string>
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const amount = Number(body.amount)
  const tripId = body.tripId?.trim() ?? ''
  const bookingType = body.bookingType ?? 'hotel'

  if (!Number.isFinite(amount) || amount < 50 || !tripId) {
    return NextResponse.json({ error: 'amount and tripId are required.' }, { status: 400 })
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

  const result = await createPaymentIntent({
    amount,
    tripId,
    bookingType,
    currency: body.currency ?? 'usd',
    description: body.description,
    metadata: body.metadata,
    accessToken: session.access_token,
  })

  if (isPaymentIntentError(result)) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 })
  }

  return NextResponse.json({
    clientSecret: result.paymentIntentClientSecret,
    paymentIntentId: result.paymentIntentClientSecret.split('_secret_')[0],
  })
}
