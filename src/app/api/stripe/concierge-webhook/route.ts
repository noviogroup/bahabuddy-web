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
  id?: string
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

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

/** Order statuses a payment event may still move forward from. */
const PRE_PAYMENT_STATUSES = ['checkout_started', 'pending', 'payment_failed']
/** Payment statuses a successful payment may overwrite. */
const UNSETTLED_PAYMENT_STATUSES = ['unpaid', 'pending', 'failed']

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

  if (event.id && await eventAlreadyProcessed(supabase, event.id)) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await handleCheckoutSessionPaid(
          supabase,
          event.data.object as unknown as CheckoutSession,
        )
        break
      case 'checkout.session.async_payment_failed':
        await handleCheckoutSessionAsyncFailed(
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

  if (event.id) await recordProcessedEvent(supabase, event)

  return NextResponse.json({ received: true })
}

/**
 * Idempotency is best-effort: every handler below is also safe to replay
 * (conditional, forward-only updates), so a missing events table only
 * costs a redundant no-op write.
 */
async function eventAlreadyProcessed(supabase: AdminClient, eventId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('stripe_webhook_events')
      .select('id')
      .eq('stripe_event_id', eventId)
      .maybeSingle()
    if (error) {
      console.error('[concierge-webhook] event lookup failed', error.message)
      return false
    }
    return Boolean(data)
  } catch (error) {
    console.error('[concierge-webhook] event lookup threw', error)
    return false
  }
}

async function recordProcessedEvent(supabase: AdminClient, event: StripeEvent) {
  try {
    const { error } = await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed_for: 'concierge-webhook',
      payload: { id: event.id, type: event.type },
    })
    if (error && error.code !== '23505') {
      console.error('[concierge-webhook] event record failed', error.message)
    }
  } catch (error) {
    console.error('[concierge-webhook] event record threw', error)
  }
}

type OrderRow = {
  id: string
  traveler_email?: string | null
  traveler_name?: string | null
}

async function findOrderForSession(supabase: AdminClient, session: CheckoutSession): Promise<OrderRow | null> {
  const orderId = session.metadata?.order_id
  if (orderId) {
    const { data, error } = await supabase
      .from('concierge_orders')
      .select('id, traveler_email, traveler_name')
      .eq('id', orderId)
      .maybeSingle()
    if (error) throw error
    if (data) return data as OrderRow
  }

  const { data, error } = await supabase
    .from('concierge_orders')
    .select('id, traveler_email, traveler_name')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle()
  if (error) throw error
  return (data as OrderRow | null) ?? null
}

async function handleCheckoutSessionPaid(
  supabase: AdminClient,
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
  const paid = isSessionPaid(session.payment_status)
  const now = new Date().toISOString()

  const existing = await findOrderForSession(supabase, session)

  if (!existing) {
    // Guest checkout (no pre-created order row): create it once. A concurrent
    // redelivery that loses the insert race falls through to the update path.
    const { error } = await supabase.from('concierge_orders').insert({
      user_id: metadata.user_id || null,
      offer_type: offerId,
      price_usd: priceUsd,
      status: paid ? 'paid' : 'pending',
      payment_status: paid ? 'paid' : 'unpaid',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      source: metadata.source ?? 'concierge_page',
      traveler_email: travelerEmail,
      traveler_name: travelerName,
      notes: `Stripe Checkout completed for ${offer.name}.`,
      updated_at: now,
    })
    if (!error) return
    if (error.code !== '23505') throw error
    const raced = await findOrderForSession(supabase, session)
    if (!raced) throw error
    return applyPaymentToOrder(supabase, raced, { session, paymentIntentId, priceUsd, paid, travelerEmail, travelerName, now })
  }

  return applyPaymentToOrder(supabase, existing, { session, paymentIntentId, priceUsd, paid, travelerEmail, travelerName, now })
}

async function applyPaymentToOrder(
  supabase: AdminClient,
  order: OrderRow,
  input: {
    session: CheckoutSession
    paymentIntentId: string | null
    priceUsd: number
    paid: boolean
    travelerEmail: string | null
    travelerName: string | null
    now: string
  },
) {
  // Payment facts only. Customer-entered fields are filled only when empty.
  const paymentFields: Record<string, unknown> = {
    stripe_checkout_session_id: input.session.id,
    price_usd: input.priceUsd,
    updated_at: input.now,
  }
  if (input.paymentIntentId) paymentFields.stripe_payment_intent_id = input.paymentIntentId
  if (!order.traveler_email && input.travelerEmail) paymentFields.traveler_email = input.travelerEmail
  if (!order.traveler_name && input.travelerName) paymentFields.traveler_name = input.travelerName

  const { error: fieldsError } = await supabase
    .from('concierge_orders')
    .update(paymentFields)
    .eq('id', order.id)
  if (fieldsError) throw fieldsError

  if (input.paid) {
    // Forward-only: never un-refund, and never pull an in-review/delivered
    // order back to 'paid' on a redelivered or out-of-order event.
    const { error: paymentError } = await supabase
      .from('concierge_orders')
      .update({ payment_status: 'paid', updated_at: input.now })
      .eq('id', order.id)
      .in('payment_status', UNSETTLED_PAYMENT_STATUSES)
    if (paymentError) throw paymentError

    const { error: statusError } = await supabase
      .from('concierge_orders')
      .update({ status: 'paid', updated_at: input.now })
      .eq('id', order.id)
      .in('status', PRE_PAYMENT_STATUSES)
    if (statusError) throw statusError
    return
  }

  // Delayed payment method: the session completed but money has not settled.
  const { error: pendingError } = await supabase
    .from('concierge_orders')
    .update({ status: 'pending', updated_at: input.now })
    .eq('id', order.id)
    .in('status', ['checkout_started'])
  if (pendingError) throw pendingError
}

async function handleCheckoutSessionAsyncFailed(
  supabase: AdminClient,
  session: CheckoutSession,
) {
  if ((session.metadata ?? {}).product !== CONCIERGE_PRODUCT) return
  const order = await findOrderForSession(supabase, session)
  if (!order) return

  const { error } = await supabase
    .from('concierge_orders')
    .update({
      status: 'payment_failed',
      payment_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .in('payment_status', ['unpaid', 'pending'])
  if (error) throw error
}

async function handlePaymentIntentFailed(
  supabase: AdminClient,
  paymentIntent: Record<string, unknown>,
) {
  const paymentIntentId = String(paymentIntent.id ?? '')
  if (!paymentIntentId) return

  // A failed attempt must not overwrite an order that was later paid or refunded.
  const { error } = await supabase
    .from('concierge_orders')
    .update({
      status: 'payment_failed',
      payment_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntentId)
    .in('payment_status', ['unpaid', 'pending', 'failed'])

  if (error) throw error
}

async function handleChargeRefunded(
  supabase: AdminClient,
  charge: Record<string, unknown>,
) {
  const paymentIntentId = extractPaymentIntentId(
    charge.payment_intent as CheckoutSession['payment_intent'],
  )
  if (!paymentIntentId) return

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

/** Records what was actually charged, including $0 for a 100%-off promotion code. */
function derivePriceUsd(amountTotal: number | null | undefined, offer: ConciergeOffer): number {
  if (typeof amountTotal === 'number' && Number.isFinite(amountTotal)) {
    return Number((amountTotal / 100).toFixed(2))
  }
  return offer.priceUsd
}

function isSessionPaid(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === 'paid' || paymentStatus === 'no_payment_required'
}
