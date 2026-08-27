import { NextResponse } from 'next/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'
import {
  normalizeFlightAncillaries,
  normalizeFlightSeatMaps,
  normalizeSelectedFlightServices,
} from '@/lib/flight-seat-map'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: { prebookId: string } }

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication is required to select flight add-ons.' }, { status: 401 })
    }

    const body = await request.json()
    let selectedServices
    try {
      selectedServices = normalizeSelectedFlightServices(body.selectedServices)
    } catch (error) {
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Selected flight services are invalid.',
      }, { status: 400 })
    }
    if (!params.prebookId || selectedServices.length === 0) {
      return NextResponse.json({ error: 'prebookId and selectedServices are required.' }, { status: 400 })
    }

    const result = await callTravelProvider(
      `/flights/prebooks/${encodeURIComponent(params.prebookId)}/services`,
      { selectedServices },
    )
    const prebook = firstRecord(result.data)
    const payment = asRecord(prebook.payment)
    const price = asRecord(prebook.price)

    return NextResponse.json({
      prebook_id: stringValue(prebook.prebookId ?? prebook.id ?? prebook.prebook_id, params.prebookId),
      transaction_id: stringValue(payment.transactionId ?? prebook.transactionId ?? prebook.transaction_id),
      client_secret: stringValue(payment.clientSecret ?? payment.client_secret ?? prebook.clientSecret ?? prebook.client_secret ?? prebook.secretKey),
      publishable_key: stringValue(payment.publishableKey ?? payment.publishable_key ?? prebook.publishableKey ?? prebook.publishable_key),
      price: numberValue(price.amount ?? prebook.amount ?? prebook.total),
      currency: stringValue(price.currency ?? prebook.currency, 'USD'),
      seat_maps: normalizeFlightSeatMaps(prebook),
      ancillaries: normalizeFlightAncillaries(prebook),
    }, { status: result.status })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json(
      { error: response.error, details: response.details },
      { status: response.status },
    )
  }
}

function firstRecord(value: unknown): Record<string, unknown> {
  const data = asRecord(value).data ?? value
  return Array.isArray(data) ? asRecord(data[0]) : asRecord(data)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown): number {
  const result = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(result) ? result : 0
}
