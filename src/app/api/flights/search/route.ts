import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'
import type { CardData } from '@/components/RichCards'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const origin = String(body.origin_city ?? body.origin ?? '').trim().toUpperCase()
    const destination = String(body.destination ?? '').trim().toUpperCase()
    const departureDate = String(body.departure_date ?? '').trim()
    const returnDate = typeof body.return_date === 'string' ? body.return_date.trim() : ''

    if (!origin || !destination || !departureDate) {
      return NextResponse.json({ error: 'origin_city, destination, and departure_date are required.' }, { status: 400 })
    }

    const legs = [
      { origin, destination, date: departureDate, direction: 'OUTBOUND' },
      ...(returnDate ? [{ origin: destination, destination: origin, date: returnDate, direction: 'INBOUND' }] : []),
    ]

    const result = await callTravelProvider('/flights/rates', {
      legs,
      adults: Math.max(1, Number(body.passengers ?? 1)),
      cabinClass: String(body.cabin_class ?? 'economy').toUpperCase(),
      currency: 'USD',
      country: 'US',
    })

    const cards = shapeFlightCards(result.data)
    return NextResponse.json({
      results: cards,
      count: cards.length,
      cards,
      message: cards.length === 0 ? `No flights found from ${origin} to ${destination} on ${departureDate}.` : undefined,
    })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json({ error: response.error, details: response.details }, { status: response.status })
  }
}

function shapeFlightCards(response: unknown): CardData[] {
  const batches = Array.isArray(asRecord(response).data) ? asRecord(response).data as unknown[] : []
  const cards: CardData[] = []

  for (const batchValue of batches) {
    const batch = asRecord(batchValue)
    const journeys = Array.isArray(batch.journeys) ? batch.journeys : []
    for (const journeyValue of journeys) {
      const journey = asRecord(journeyValue)
      const segments = recordList(journey.segments)
      const outbound = segments.filter((segment) => segment.direction !== 'INBOUND')
      const shownSegments = outbound.length > 0 ? outbound : segments
      const first = shownSegments[0] ?? {}
      const last = shownSegments[shownSegments.length - 1] ?? first
      const carrier = asRecord(first.carrier)
      const duration = asRecord(journey.totalDuration)
      const offers = recordList(journey.offers)
      const passengerCounts = asRecord(journey.parameters)
      const passengerTotal = numberValue(passengerCounts.adults, 1) +
        numberValue(passengerCounts.children) +
        numberValue(passengerCounts.infants)

      for (const offer of offers) {
        const display = asRecord(asRecord(offer.pricing).display)
        const fare = asRecord(offer.fare)
        const terms = asRecord(offer.terms)
        cards.push({
          card_type: 'flight',
          offer_id: stringValue(offer.offerId),
          provider_offer_id: stringValue(offer.offerId),
          route: `${stringValue(first.originCode)} → ${stringValue(last.destinationCode)}`,
          airline: stringValue(carrier.marketingName, stringValue(carrier.operatingName, 'Airline')),
          departure: formatFlightTime(first.departureTime),
          arrival: formatFlightTime(last.arrivalTime),
          duration: formatDuration(numberValue(duration.minutes)),
          stops: shownSegments.length <= 1 ? 'Direct' : `${shownSegments.length - 1} stop${shownSegments.length > 2 ? 's' : ''}`,
          price: numberValue(display.total),
          cabin_class: stringValue(fare.family, 'Economy'),
          passengers: Math.max(1, passengerTotal),
          baggage: { checked: baggageCount(offer.baggage) },
          description: terms.refundable === true ? 'Refundable fare' : undefined,
        })
      }
    }
  }

  return cards
    .filter((card) => card.offer_id && typeof card.price === 'number' && card.price > 0)
    .sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0))
    .slice(0, 20)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function recordList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || fallback
}

function formatFlightTime(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`
}

function baggageCount(value: unknown): number {
  const included = recordList(asRecord(value).included)
  return included.filter((bag) => /checked/i.test(stringValue(bag.description))).length
}
