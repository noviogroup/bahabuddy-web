import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ItemType = 'hotel' | 'stay' | 'accommodation' | 'flight' | 'restaurant' | 'activity' | 'transport'
type TimeSlot = 'morning' | 'afternoon' | 'evening'

interface TripItemBody {
  itemType?: ItemType
  sourceId?: string
  sourceType?: string
  name?: string
  island?: string
  date?: string
  endDate?: string
  dayNumber?: number
  timeSlot?: TimeSlot
  provider?: string
  providerHotelId?: string
  providerRateId?: string
  providerOfferId?: string
  origin?: string
  destination?: string
  departureAt?: string
  arrivalAt?: string
  airline?: string
  price?: number
  pricePerNight?: number
  currency?: string
  guests?: number
  imageUrl?: string
  notes?: string
  metadata?: Record<string, unknown>
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication is required to add items to a trip.' }, { status: 401 })
  }

  const tripId = params.id
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 })
  }
  if (!trip) {
    return NextResponse.json({ error: 'Trip not found.' }, { status: 404 })
  }

  let body: TripItemBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const itemType = normalizeItemType(body.itemType)
  const name = body.name?.trim()
  if (!itemType || !name) {
    return NextResponse.json({ error: 'itemType and name are required.' }, { status: 400 })
  }

  if (itemType === 'hotel' || itemType === 'stay' || itemType === 'accommodation') {
    const row = {
      trip_id: tripId,
      place_id: clean(body.sourceId),
      name,
      island: clean(body.island),
      check_in: dateOrNull(body.date),
      check_out: dateOrNull(body.endDate),
      price_per_night: numberOrNull(body.pricePerNight),
      guests: integerOrNull(body.guests),
      liteapi_hotel_id: clean(body.providerHotelId ?? body.sourceId),
      liteapi_rate_id: clean(body.providerRateId),
      total_price: numberOrNull(body.price),
      currency: clean(body.currency)?.toUpperCase() ?? 'USD',
      nights: nightsBetween(body.date, body.endDate),
      photo_url: clean(body.imageUrl),
      status: 'planned',
    }

    const { data, error } = await supabase
      .from('trip_accommodations')
      .insert(row)
      .select('id, status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tripId, tripItemId: data.id, itemType: 'accommodation', status: data.status ?? 'planned' })
  }

  if (itemType === 'flight') {
    const route = parseRoute(body)
    const row = {
      trip_id: tripId,
      origin: route.origin,
      destination: route.destination,
      departure_at: dateTimeOrNull(body.departureAt),
      arrival_at: dateTimeOrNull(body.arrivalAt),
      airline: clean(body.airline ?? name),
      price: numberOrNull(body.price),
      duffel_offer_id: clean(body.providerOfferId ?? body.sourceId),
    }

    const { data, error } = await supabase
      .from('trip_flights')
      .insert(row)
      .select('id, booking_reference')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tripId, tripItemId: data.id, itemType: 'flight', status: data.booking_reference ? 'booked' : 'planned' })
  }

  const row = {
    trip_id: tripId,
    day_number: Math.max(1, Math.trunc(body.dayNumber ?? 1)),
    time_slot: normalizeTimeSlot(body.timeSlot),
    activity_name: name,
    activity_type: itemType,
    place_id: clean(body.sourceId),
    notes: clean(body.notes ?? metadataString(body.metadata, 'why')),
    sort_order: sortOrderForSlot(body.timeSlot),
  }

  const { data, error } = await supabase
    .from('trip_activities')
    .insert(row)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tripId, tripItemId: data.id, itemType, status: 'planned' })
}

function normalizeItemType(value: unknown): ItemType | null {
  if (typeof value !== 'string') return null
  const normalized = value.toLowerCase().replace(/[^a-z_]/g, '')
  if (normalized === 'stay') return 'stay'
  if (normalized === 'hotel') return 'hotel'
  if (normalized === 'accommodation') return 'accommodation'
  if (normalized === 'flight') return 'flight'
  if (normalized === 'restaurant') return 'restaurant'
  if (normalized === 'activity') return 'activity'
  if (normalized === 'transport') return 'transport'
  return null
}

function normalizeTimeSlot(value: unknown): TimeSlot {
  return value === 'morning' || value === 'evening' ? value : 'afternoon'
}

function sortOrderForSlot(value: unknown): number {
  if (value === 'morning') return 0
  if (value === 'evening') return 2
  return 1
}

function clean(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function metadataString(metadata: TripItemBody['metadata'], key: string): string | undefined {
  const value = metadata?.[key]
  return typeof value === 'string' ? value : undefined
}

function numberOrNull(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function integerOrNull(value: unknown): number | null {
  const n = numberOrNull(value)
  return n === null ? null : Math.max(1, Math.trunc(n))
}

function dateOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function dateTimeOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function nightsBetween(start: unknown, end: unknown): number | null {
  const checkin = dateOrNull(start)
  const checkout = dateOrNull(end)
  if (!checkin || !checkout) return null
  const nights = Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000)
  return nights > 0 ? nights : null
}

function parseRoute(body: TripItemBody): { origin: string; destination: string } {
  const source = body.origin?.trim()
  const destination = body.destination?.trim()
  if (source && destination) return { origin: source.toUpperCase(), destination: destination.toUpperCase() }

  const route = body.name ?? ''
  const parts = route.split(/[→>-]/).map((part) => part.trim()).filter(Boolean)
  return {
    origin: (parts[0] ?? 'TBD').toUpperCase(),
    destination: (parts[1] ?? 'BS').toUpperCase(),
  }
}
