import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { CONCIERGE_PRODUCT, getConciergeOffer } from '@/lib/stripe/concierge-offers'

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

  const origin = inferOrigin(headers())
  const successUrl = `${origin}/concierge-trip-plan/success?session_id={CHECKOUT_SESSION_ID}&offer=${encodeURIComponent(offerId)}`
  const cancelUrl = `${origin}/concierge-trip-plan?checkout=cancelled&offer=${encodeURIComponent(offerId)}`

  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('success_url', successUrl)
  params.set('cancel_url', cancelUrl)
  params.set('billing_address_collection', 'auto')
  params.set('allow_promotion_codes', 'true')
  params.set('customer_creation', 'if_required')
  params.set('line_items[0][quantity]', '1')
  params.set('line_items[0][price_data][currency]', 'usd')
  params.set('line_items[0][price_data][unit_amount]', String(offer.amountCents))
  params.set('line_items[0][price_data][product_data][name]', offer.name)
  params.set('line_items[0][price_data][product_data][description]', offer.description)
  params.set('metadata[product]', CONCIERGE_PRODUCT)
  params.set('metadata[offer_id]', offerId)
  params.set('metadata[source]', source)
  params.set('payment_intent_data[metadata][product]', CONCIERGE_PRODUCT)
  params.set('payment_intent_data[metadata][offer_id]', offerId)
  params.set('payment_intent_data[metadata][source]', source)

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

  const session = await response.json() as { url?: string }

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
