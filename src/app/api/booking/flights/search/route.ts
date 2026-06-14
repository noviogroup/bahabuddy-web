import { NextResponse } from 'next/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'

type FlightLeg = {
  origin?: string
  destination?: string
  date?: string
  direction?: 'OUTBOUND' | 'INBOUND'
  filters?: Record<string, unknown>
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const legs = normalizeLegs(body.legs)

    if (legs.length === 0) {
      return NextResponse.json(
        { error: 'At least one flight leg is required.' },
        { status: 400 }
      )
    }

    const payload = {
      legs,
      adults: Number(body.adults ?? 1),
      children: Number(body.children ?? 0),
      infants: Number(body.infants ?? 0),
      ...(Array.isArray(body.childrenAges) ? { childrenAges: body.childrenAges } : {}),
      ...(Array.isArray(body.infantAges) ? { infantAges: body.infantAges } : {}),
      ...(body.cabinClass ? { cabinClass: body.cabinClass } : {}),
      currency: String(body.currency ?? 'USD').toUpperCase(),
      country: String(body.country ?? 'US').toUpperCase(),
      ...(body.filters && typeof body.filters === 'object' ? { filters: body.filters } : {}),
      ...(body.sort && typeof body.sort === 'object' ? { sort: body.sort } : {}),
    }

    if (payload.adults < 1) {
      return NextResponse.json(
        { error: 'At least one adult passenger is required.' },
        { status: 400 }
      )
    }

    const result = await callTravelProvider('/flights/rates', payload)
    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json(
      { error: response.error, details: response.details },
      { status: response.status }
    )
  }
}

function normalizeLegs(value: unknown): FlightLeg[] {
  if (!Array.isArray(value)) return []

  return value
    .map((leg) => {
      const item = leg as FlightLeg
      return {
        origin: item.origin?.trim().toUpperCase(),
        destination: item.destination?.trim().toUpperCase(),
        date: item.date,
        ...(item.direction ? { direction: item.direction } : {}),
        ...(item.filters && typeof item.filters === 'object' ? { filters: item.filters } : {}),
      }
    })
    .filter((leg) => Boolean(leg.origin && leg.destination && leg.date))
}
