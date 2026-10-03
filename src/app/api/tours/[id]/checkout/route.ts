import { NextResponse } from 'next/server'

import { isTourId } from '@/lib/self-guided-tours'
import { createClient } from '@/lib/supabase/server'
import {
  createSelfTourPaymentIntent,
  isSelfTourPaymentIntentError,
} from '@/lib/stripe/edge-function'

export const dynamic = 'force-dynamic'

/**
 * POST /api/tours/[id]/checkout
 *
 * Opens (or resumes) a Stripe PaymentIntent for a priced self-guided tour via
 * the shared `stripe-payment` Edge Function (booking_type 'self_tour'). The
 * Edge Function owns price, currency, duplicate-checkout convergence and the
 * free/owned/anonymous guards; this route only forwards the signed-in user's
 * access token and passes the result codes through.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const tourId = params.id?.trim() ?? ''
  if (!isTourId(tourId)) {
    return NextResponse.json({ error: 'Unknown tour.', code: 'INVALID_TOUR_ID' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to buy this tour.', code: 'AUTH_REQUIRED' }, { status: 401 })
  }
  if ((user as { is_anonymous?: boolean }).is_anonymous) {
    return NextResponse.json(
      { error: 'Create an account to buy this tour.', code: 'ACCOUNT_REQUIRED' },
      { status: 403 },
    )
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return NextResponse.json({ error: 'Missing session token.', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const result = await createSelfTourPaymentIntent({ tourId, accessToken: session.access_token })
  if (isSelfTourPaymentIntentError(result)) {
    const status = result.status && result.status >= 400 ? result.status : 500
    return NextResponse.json({ error: result.error, code: result.code }, { status })
  }

  return NextResponse.json({
    clientSecret: result.paymentIntentClientSecret,
    paymentIntentId: result.paymentIntentId ?? result.paymentIntentClientSecret.split('_secret_')[0],
    publishableKey: result.publishableKey ?? null,
    amountCents: result.amountCents ?? null,
    currency: result.currency ?? null,
  })
}
