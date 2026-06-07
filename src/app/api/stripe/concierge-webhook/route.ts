import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CONCIERGE_PRODUCT,
  getConciergeOffer,
  type ConciergeOffer,
} from '@/lib/stripe/concierge-offers'
import { verifyStripeWebhookSignature } from '@/lib/stripe/verify-webhook-signature'

export const runtime = 'nodejs'

const WEBHOOK_SECRET = process.env.STRIPE_CONCIERGE_WEBHOOK_SECRET ?? ''

interface StripeEvent {
  type: string
  data: {
    object: Record<string, unknown>
  }
}

interface CheckoutSession {
  id: string
  payment_intent?: string | { id?: string } | null
  customer_email?: string | null
  customer_details?: { name?: string | null; email?: string | null } | null
  amount_total?: number | null
  currency?: string | null
  payment_status?: string | null
  metadata?: Record<string, string>
}

export async function POST(request: Request) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Stripe concierge webhook secret is not configured.' },
      { status: 500 },
    )
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase service role is not configured.' },
      { status: 500 },
    )
  }

  const signature = request.headers.get('stripe-signature')
  const payload = await request.text()

  if (!verifyStripeWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 })
  }

  let event: StripeEvent
  try {
    event = JSON.parse(payload) as StripeEvent
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          supabase,
          event.data.object as unknown as CheckoutSession,
        )
        break
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(supabase, event.data.object)
        break
      case 'charge.refunded':
        await handleChargeRefunded(supabase, event.data.object)
        break
      default:
        break
    }
  } catch (error) {
    console.error('[concierge-webhook]', event.type, error)
    return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutSessionCompleted(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  session: CheckoutSession,
) {
  const metadata = session.metadata ?? {}
  if (metadata.product !== CONCIERGE_PRODUCT) return

  const offerId = metadata.offer_id ?? ''
  const offer = getConciergeOffer(offerId)
  if (!offer) {
    throw new Error(`Unknown concierge offer_id: ${offerId}`)
  }

  const paymentIntentId = extractPaymentIntentId(session.payment_intent)
  const travelerEmail =
    session.customer_email ?? session.customer_details?.email ?? null
  const travelerName = session.customer_details?.name ?? null
  const priceUsd = derivePriceUsd(session.amount_total, offer)
  const { status, paymentStatus } = mapCheckoutPaymentStatus(session.payment_status)

  const { error } = await supabase.from('concierge_orders').upsert(
    {
      offer_type: offerId,
      price_usd: priceUsd,
      status,
      payment_status: paymentStatus,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      source: metadata.source ?? 'concierge_page',
      traveler_email: travelerEmail,
      traveler_name: travelerName,
      notes: `Stripe Checkout completed for ${offer.name}.`,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_checkout_session_id' },
  )

  if (error) throw error
}

async function handlePaymentIntentFailed(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  paymentIntent: Record<string, unknown>,
) {
  const paymentIntentId = String(paymentIntent.id ?? '')
  if (!paymentIntentId) return

  const { data: existing, error: lookupError } = await supabase
    .from('concierge_orders')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (lookupError) throw lookupError
  if (!existing) return

  const { error } = await supabase
    .from('concierge_orders')
    .update({
      status: 'payment_failed',
      payment_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntentId)

  if (error) throw error
}

async function handleChargeRefunded(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  charge: Record<string, unknown>,
) {
  const paymentIntentId = extractPaymentIntentId(
    charge.payment_intent as CheckoutSession['payment_intent'],
  )
  if (!paymentIntentId) return

  const { data: existing, error: lookupError } = await supabase
    .from('concierge_orders')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (lookupError) throw lookupError
  if (!existing) return

  const { error } = await supabase
    .from('concierge_orders')
    .update({
      status: 'refunded',
      payment_status: 'refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntentId)

  if (error) throw error
}

function extractPaymentIntentId(
  paymentIntent: CheckoutSession['payment_intent'],
): string | null {
  if (!paymentIntent) return null
  if (typeof paymentIntent === 'string') return paymentIntent
  return paymentIntent.id ?? null
}

function derivePriceUsd(amountTotal: number | null | undefined, offer: ConciergeOffer): number {
  if (typeof amountTotal === 'number' && amountTotal > 0) {
    return Number((amountTotal / 100).toFixed(2))
  }
  return offer.priceUsd
}

function mapCheckoutPaymentStatus(paymentStatus: string | null | undefined): {
  status: string
  paymentStatus: string
} {
  if (paymentStatus === 'paid' || paymentStatus === 'no_payment_required') {
    return { status: 'paid', paymentStatus: 'paid' }
  }

  return { status: 'pending', paymentStatus: 'unpaid' }
}
