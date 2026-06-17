import { NextResponse } from 'next/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'

type JsonRecord = Record<string, unknown>

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const offerId = String(body.offerId ?? '')

    if (!offerId) {
      return NextResponse.json({ error: 'offerId is required.' }, { status: 400 })
    }

    const result = await callTravelProvider('/flights/verify', { offerId })
    const offer = firstRecord(result.data)
    const price = numberValue(
      nested(offer, ['pricing', 'display', 'total'])
        ?? nested(offer, ['price', 'amount'])
        ?? offer.total
        ?? offer.amount
    )
    const currency = stringValue(
      nested(offer, ['pricing', 'display', 'currency'])
        ?? nested(offer, ['price', 'currency'])
        ?? offer.currency,
      'USD'
    )
    const changes = asRecord(offer.changes)
    const flight = flightSummary(offer)

    return NextResponse.json({
      offer_id: stringValue(offer.offerId ?? offer.id, offerId),
      ...flight,
      price,
      currency,
      expiration: offer.expiresAt ?? offer.expiration ?? offer.expires_at ?? null,
      price_changed: Boolean(changes.priceChanged ?? changes.price_changed),
      previous_price: numberValue(changes.previousPrice ?? changes.previous_price),
      change_messages: Array.isArray(changes.messages) ? changes.messages : [],
      baggage: offer.baggage ?? nested(offer, ['journey', 'baggage']) ?? null,
      refundable: offer.refundable ?? null,
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

function nested(record: JsonRecord, path: string[]): unknown {
  let current: unknown = record
  for (const key of path) {
    current = asRecord(current)[key]
  }
  return current
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function flightSummary(offer: JsonRecord) {
  const journey = asRecord(offer.journey ?? offer.itinerary ?? offer.flight)
  const segments = firstArray(
    journey.segments,
    journey.legs,
    journey.flights,
    offer.segments,
    offer.legs,
    offer.flights
  ).map(asRecord)
  const first = segments[0] ?? journey
  const last = segments[segments.length - 1] ?? journey

  return {
    origin: airportCode(first.departure ?? first.origin ?? first.departureAirport ?? first.departure_airport),
    destination: airportCode(last.arrival ?? last.destination ?? last.arrivalAirport ?? last.arrival_airport),
    airline: stringValue(first.airlineName ?? first.airline ?? first.marketingCarrier ?? first.carrier),
    departure_at: stringValue(first.departureTime ?? first.departureAt ?? first.departure_at ?? first.departsAt),
    arrival_at: stringValue(last.arrivalTime ?? last.arrivalAt ?? last.arrival_at ?? last.arrivesAt),
  }
}

function airportCode(value: unknown): string {
  if (typeof value === 'string') return value.trim().toUpperCase()
  const record = asRecord(value)
  return stringValue(record.iataCode ?? record.iata_code ?? record.code ?? record.airportCode).toUpperCase()
}

function firstArray(...values: unknown[]): unknown[] {
  for (const value of values) {
    if (Array.isArray(value)) return value
  }
  return []
}
