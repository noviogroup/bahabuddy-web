import { NextResponse } from 'next/server'
import { resolveAirportCode } from '@/lib/airports'
import { resolveAirlineLogoUrl } from '@/lib/airline-logos'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'
import type { CardData } from '@/components/RichCards'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawOrigin = String(body.origin_city ?? body.origin ?? '').trim()
    const origin = resolveAirportCode(rawOrigin)
    const destination = String(body.destination ?? '').trim().toUpperCase()
    const departureDate = String(body.departure_date ?? '').trim()
    const returnDate = typeof body.return_date === 'string' ? body.return_date.trim() : ''

    if (!rawOrigin || !destination || !departureDate) {
      return NextResponse.json({ error: 'origin_city, destination, and departure_date are required.' }, { status: 400 })
    }

    if (!origin) {
      return NextResponse.json({ error: `Could not resolve airport code for "${rawOrigin}". Try a 3-letter IATA code like MIA, JFK, or ATL.` }, { status: 400 })
    }

    const legs = [
      { origin, destination, date: departureDate, direction: 'OUTBOUND' },
      ...(returnDate ? [{ origin: destination, destination: origin, date: returnDate, direction: 'INBOUND' }] : []),
    ]

    const requestedPassengers = Math.max(1, Number(body.passengers ?? 1))

    const result = await callTravelProvider('/flights/rates', {
      legs,
      adults: requestedPassengers,
      cabinClass: String(body.cabin_class ?? 'economy').toUpperCase(),
      currency: 'USD',
      country: 'US',
    })

    const cards = shapeFlightCards(result.data, requestedPassengers)
    return NextResponse.json({
      results: cards,
      count: cards.length,
      cards,
      message: cards.length === 0 ? `No flights found from ${origin} to ${destination} on ${departureDate}.` : undefined,
    })
  } catch (error) {
    if (error instanceof Error && /provider is not configured/i.test(error.message)) {
      return NextResponse.json(
        { error: 'Live flight search is not configured for this environment yet.' },
        { status: 503 },
      )
    }

    const response = getProviderErrorResponse(error)
    return NextResponse.json({ error: response.error, details: response.details }, { status: response.status })
  }
}

function shapeFlightCards(response: unknown, requestedPassengers = 1): CardData[] {
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
      const passengerTotal = numberValue(passengerCounts.adults, requestedPassengers) +
        numberValue(passengerCounts.children) +
        numberValue(passengerCounts.infants)

      for (const offer of offers) {
        const display = asRecord(asRecord(offer.pricing).display)
        const fare = asRecord(offer.fare)
        const terms = asRecord(offer.terms)
        const airlineName = stringValue(carrier.marketingName, stringValue(carrier.operatingName, 'Airline'))
        const airlineCode = stringValue(carrier.marketingCode, stringValue(carrier.operatingCode, stringValue(carrier.iataCode)))
        const providerLogoUrl = stringValue(carrier.logoUrl, stringValue(carrier.logo_url))
        cards.push({
          card_type: 'flight',
          offer_id: stringValue(offer.offerId),
          provider_offer_id: stringValue(offer.offerId),
          route: `${stringValue(first.originCode)} to ${stringValue(last.destinationCode)}`,
          airline: airlineName,
          airline_code: airlineCode,
          airline_logo_url: resolveAirlineLogoUrl({
            providerLogoUrl,
            airlineCode,
            airlineName,
          }),
          departure: formatFlightTime(first.departureTime),
          arrival: formatFlightTime(last.arrivalTime),
          duration: formatDuration(numberValue(duration.minutes)),
          stops: shownSegments.length <= 1 ? 'Direct' : `${shownSegments.length - 1} stop${shownSegments.length > 2 ? 's' : ''}`,
          price: numberValue(display.total),
          currency: stringValue(display.currency, 'USD'),
          cabin_class: stringValue(fare.family, 'Economy'),
          fare_brand: stringValue(fare.brandName, stringValue(fare.name, stringValue(fare.family))),
          passengers: Math.max(requestedPassengers, passengerTotal),
          baggage: baggageSummary(offer.baggage),
          refundable: terms.refundable === true,
          changeable: terms.changeable === true,
          expiration: stringValue(offer.expiresAt, stringValue(offer.expires_at, stringValue(offer.expiration))),
          layovers: layoversFromSegments(shownSegments),
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

function baggageSummary(value: unknown): { carry_on?: boolean; checked?: number } {
  const baggage = asRecord(value)
  const included = recordList(baggage.included)
  const checkedPieces = included.reduce((total, bag) => {
    const description = stringValue(bag.description)
    const bagType = stringValue(bag.bagType)
    const pieces = Math.max(1, numberValue(bag.pieces, 1))
    return /checked|hold/i.test(`${description} ${bagType}`) ? total + pieces : total
  }, 0)
  const carryOnIncluded = baggage.hasCarryOnBag === true ||
    included.some((bag) => /cabin|carry/i.test(`${stringValue(bag.description)} ${stringValue(bag.bagType)}`))
  const providerChecked = baggage.hasCheckedBag === true && checkedPieces === 0 ? 1 : checkedPieces

  return {
    ...(carryOnIncluded ? { carry_on: true } : {}),
    ...(providerChecked > 0 ? { checked: providerChecked } : {}),
  }
}

function layoversFromSegments(segments: Record<string, unknown>[]) {
  if (segments.length <= 1) return []

  const layovers = []
  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index]
    const next = segments[index + 1]
    const airport = stringValue(current.destinationCode, stringValue(current.destinationName))
    const duration = layoverDuration(current.arrivalTime, next.departureTime)
    if (airport && duration) {
      layovers.push({ airport, duration })
    }
  }
  return layovers
}

function layoverDuration(arrivalValue: unknown, departureValue: unknown): string {
  if (typeof arrivalValue !== 'string' || typeof departureValue !== 'string') return ''
  const arrival = new Date(arrivalValue)
  const departure = new Date(departureValue)
  if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime())) return ''
  const minutes = Math.max(0, Math.round((departure.getTime() - arrival.getTime()) / 60000))
  if (minutes === 0) return ''
  return formatDuration(minutes)
}
