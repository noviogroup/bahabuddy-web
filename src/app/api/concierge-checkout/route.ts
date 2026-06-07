import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { CONCIERGE_PRODUCT, getConciergeOffer } from '@/lib/stripe/concierge-offers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? ''

export async function POST(request: Request) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe secret key is not configured.' },
      { status: 500 }
    )
  }

  const formData = await request.formData()
  const offerId = String(formData.get('offer_id') ?? '')
  const source = String(formData.get('source') ?? 'concierge_page')
  const offer = getConciergeOffer(offerId)

  if (!offer) {
    return NextResponse.json({ error: 'Invalid concierge offer.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  let profile: { display_name?: string | null } | null = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
    profile = data
  }

  let orderId: string | null = null
  if (user && admin) {
    const { data: order, error: orderError } = await admin
      .from('concierge_orders')
      .insert({
        user_id: user.id,
        offer_type: offerId,
        price_usd: offer.priceUsd,
        status: 'checkout_started',
        payment_status: 'unpaid',
        source,
        traveler_email: user.email ?? null,
        traveler_name: profile?.display_name ?? user.user_metadata?.display_name ?? null,
        notes: `Account-based checkout started for ${offer.name}.`,
        stripe_metadata: {
          product: CONCIERGE_PRODUCT,
          offer_id: offerId,
          source,
          user_id: user.id,
        },
      })
      .select('id')
      .single()

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    orderId = order?.id ?? null
  }

  const origin = inferOrigin(headers())
  const successUrl = orderId
    ? `${origin}/dashboard/concierge/${orderId}?session_id={CHECKOUT_SESSION_ID}`
    : `${origin}/concierge-trip-plan/success?session_id={CHECKOUT_SESSION_ID}&offer=${encodeURIComponent(offerId)}`
  const cancelUrl = `${origin}/concierge-trip-plan/checkout?checkout=cancelled&offer=${encodeURIComponent(offerId)}`

  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('success_url', successUrl)
  params.set('cancel_url', cancelUrl)
  params.set('billing_address_collection', 'auto')
  params.set('allow_promotion_codes', 'true')
  params.set('customer_creation', 'if_required')
  if (user?.email) params.set('customer_email', user.email)
  params.set('line_items[0][quantity]', '1')
  params.set('line_items[0][price_data][currency]', 'usd')
  params.set('line_items[0][price_data][unit_amount]', String(offer.amountCents))
  params.set('line_items[0][price_data][product_data][name]', offer.name)
  params.set('line_items[0][price_data][product_data][description]', offer.description)
  params.set('metadata[product]', CONCIERGE_PRODUCT)
  params.set('metadata[offer_id]', offerId)
  params.set('metadata[source]', source)
  if (user?.id) params.set('metadata[user_id]', user.id)
  if (orderId) params.set('metadata[order_id]', orderId)
  params.set('payment_intent_data[metadata][product]', CONCIERGE_PRODUCT)
  params.set('payment_intent_data[metadata][offer_id]', offerId)
  params.set('payment_intent_data[metadata][source]', source)
  if (user?.id) params.set('payment_intent_data[metadata][user_id]', user.id)
  if (orderId) params.set('payment_intent_data[metadata][order_id]', orderId)

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    return NextResponse.json(
      { error: text || 'Stripe checkout could not be started.' },
      { status: response.status }
    )
  }

  const session = await response.json() as { id?: string; url?: string }

  if (orderId && session.id && admin) {
    await admin
      .from('concierge_orders')
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
  }

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 500 })
  }

  return NextResponse.redirect(session.url, { status: 303 })
}

function inferOrigin(hdrs: Headers): string {
  const forwardedHost = hdrs.get('x-forwarded-host') ?? hdrs.get('host')
  const forwardedProto = hdrs.get('x-forwarded-proto') ?? 'https'
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}
