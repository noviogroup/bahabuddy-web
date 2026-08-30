import { NextResponse } from 'next/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'
import { createClient } from '@/lib/supabase/server'
import { normalizeFlightAncillaries, normalizeFlightSeatMaps } from '@/lib/flight-seat-map'

type JsonRecord = Record<string, unknown>

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication is required to prebook a flight.' }, { status: 401 })
    }

    const body = await request.json()
    const offerId = String(body.offerId ?? '')

    if (!offerId) {
      return NextResponse.json({ error: 'offerId is required.' }, { status: 400 })
    }

    const payload = {
      ...body,
      offerId,
      usePaymentSdk: body.usePaymentSdk ?? true,
    }

    const result = await callTravelProvider('/flights/prebooks', payload)
    const prebook = firstRecord(result.data)
    const payment = asRecord(prebook.payment)
    const price = asRecord(prebook.price)

    return NextResponse.json({
      prebook_id: stringValue(prebook.prebookId ?? prebook.id ?? prebook.prebook_id),
      transaction_id: stringValue(payment.transactionId ?? prebook.transactionId ?? prebook.transaction_id),
      client_secret: stringValue(payment.clientSecret ?? payment.client_secret ?? prebook.clientSecret ?? prebook.client_secret ?? prebook.secretKey),
      publishable_key: stringValue(payment.publishableKey ?? payment.publishable_key ?? prebook.publishableKey ?? prebook.publishable_key),
      price: numberValue(price.amount ?? prebook.amount ?? prebook.total),
      currency: stringValue(price.currency ?? prebook.currency, 'USD'),
      seat_maps: normalizeFlightSeatMaps(prebook),
      ancillaries: normalizeFlightAncillaries(prebook),
      raw: result.data,
    }, { status: result.status })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json(
      { error: response.error, details: response.details },
      { status: response.status }
    )
  }
}

function firstRecord(value: unknown): JsonRecord {
  const data = asRecord(value).data ?? value
  if (Array.isArray(data)) return asRecord(data[0])
  return asRecord(data)
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}
