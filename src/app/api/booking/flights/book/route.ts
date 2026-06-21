import { NextResponse } from 'next/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type JsonRecord = Record<string, unknown>

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication is required to book a flight.' }, { status: 401 })
    }

    const body = await request.json()
    const prebookId = stringValue(body.prebookId ?? body.prebook_id)
    const transactionId = stringValue(body.transactionId ?? body.transaction_id)
    const paymentIntentId = stringValue(body.paymentIntentId ?? body.stripe_payment_intent_id)
    const tripId = stringValue(body.tripId ?? body.trip_id)
    const offerId = stringValue(body.offerId ?? body.offer_id)

    if (!prebookId || !transactionId || !tripId) {
      return NextResponse.json({ error: 'prebookId, transactionId, and tripId are required.' }, { status: 400 })
    }

    const { data: trip } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!trip) return NextResponse.json({ error: 'Trip not found.' }, { status: 404 })

    const result = await callTravelProvider('/flights/bookings', {
      prebookId,
      transactionId,
      payment: {
        method: 'TRANSACTION_ID',
        transactionId,
      },
    })
    const providerBooking = firstRecord(result.data)
    const persisted = await persistFlightBooking({
      userId: user.id,
      tripId,
      offerId,
      prebookId,
      transactionId,
      paymentIntentId,
      providerPayload: result.data,
      providerBooking,
      requestBody: asRecord(body),
    })

    const bookingReference = bookingRef(providerBooking)
    const responseStatus = persisted.localStatus === 'failed' ? 202 : result.status

    return NextResponse.json({
      bookingId: bookingReference || persisted.bookingId,
      tripId,
      tripItemId: persisted.tripItemId,
      provider: 'flight_liteapi',
      providerReference: bookingReference || null,
      paymentStatus: 'paid',
      providerStatus: normalizedStatus(providerBooking),
      localStatus: persisted.localStatus,
      localError: persisted.localError,
      supportRequired: persisted.localStatus === 'failed',
      amount: persisted.amount,
      sourceSurface: 'web',
      bookingReference,
      status: normalizedStatus(providerBooking),
      bookingRecordId: persisted.bookingId,
      price: persisted.amount,
      currency: persisted.currency.toUpperCase(),
      raw: result.data,
    }, { status: responseStatus })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json(
      { error: response.error, details: response.details },
      { status: response.status }
    )
  }
}

async function persistFlightBooking(input: {
  userId: string
  tripId: string
  offerId: string
  prebookId: string
  transactionId: string
  paymentIntentId: string
  providerPayload: unknown
  providerBooking: JsonRecord
  requestBody: JsonRecord
}): Promise<{
  bookingId: string | null
  tripItemId: string | null
  localStatus: 'saved' | 'failed'
  localError: string | null
  amount: number
  currency: string
}> {
  const admin = createAdminClient()
  const amount = moneyAmount(input.providerBooking, input.requestBody)
  const currency = moneyCurrency(input.providerBooking, input.requestBody).toLowerCase()
  if (!admin) {
    return {
      bookingId: null,
      tripItemId: null,
      localStatus: 'failed',
      localError: 'Admin database client is unavailable.',
      amount,
      currency,
    }
  }
  const localErrors: string[] = []

  const reference = bookingRef(input.providerBooking)
  const status = normalizedStatus(input.providerBooking)
  const flight = flightSummary(input.providerBooking)
  const bookingRecord = {
    user_id: input.userId,
    trip_id: input.tripId,
    booking_type: 'flight',
    type: 'flight',
    provider: 'liteapi',
    booking_ref: reference || null,
    booking_reference: reference || null,
    external_reference: reference || null,
    status,
    amount,
    amount_cents: Math.round(amount * 100),
    gross_booking_value: amount,
    currency,
    supplier_ref: reference || null,
    stripe_payment_intent_id: input.paymentIntentId || null,
    financial_metadata: {
      source_surface: 'web',
      provider_status: stringValue(input.providerBooking.status),
      prebook_id: input.prebookId,
      transaction_id: input.transactionId,
      payment_intent_id: input.paymentIntentId || null,
      offer_id: input.offerId || null,
    },
    raw_response: asJsonObject(input.providerPayload),
  }

  let bookingId: string | null = null
  if (input.paymentIntentId) {
    const { data: existing } = await admin
      .from('bookings')
      .select('id')
      .eq('user_id', input.userId)
      .eq('stripe_payment_intent_id', input.paymentIntentId)
      .maybeSingle()
    bookingId = (existing as { id?: string } | null)?.id ?? null
  }

  if (bookingId) {
    const { error } = await admin.from('bookings').update(bookingRecord).eq('id', bookingId)
    if (error) localErrors.push(`bookings update failed: ${errorMessage(error)}`)
  } else {
    const { data: bookingData, error } = await admin
      .from('bookings')
      .insert(bookingRecord)
      .select('id')
      .single()
    if (error) localErrors.push(`bookings insert failed: ${errorMessage(error)}`)
    bookingId = (bookingData as { id?: string } | null)?.id ?? null
  }

  const flightRow = {
    trip_id: input.tripId,
    origin: flight.origin || stringValue(input.requestBody.origin, 'TBD'),
    destination: flight.destination || stringValue(input.requestBody.destination, 'BS'),
    departure_at: isoOrNull(flight.departureAt ?? input.requestBody.departureAt),
    arrival_at: isoOrNull(flight.arrivalAt ?? input.requestBody.arrivalAt),
    airline: flight.airline || stringValue(input.requestBody.airline, 'Flight'),
    booking_reference: reference || null,
    price: amount || null,
    duffel_offer_id: input.offerId || null,
    stripe_payment_intent_id: input.paymentIntentId || null,
  }

  let tripItemId: string | null = null
  if (input.offerId) {
    const { data: updated, error } = await admin
      .from('trip_flights')
      .update(flightRow)
      .eq('trip_id', input.tripId)
      .eq('duffel_offer_id', input.offerId)
      .select('id')
      .maybeSingle()
    if (error) localErrors.push(`trip_flights update failed: ${errorMessage(error)}`)
    tripItemId = (updated as { id?: string } | null)?.id ?? null
  }

  if (!tripItemId) {
    const { data: inserted, error } = await admin
      .from('trip_flights')
      .insert(flightRow)
      .select('id')
      .single()
    if (error) localErrors.push(`trip_flights insert failed: ${errorMessage(error)}`)
    tripItemId = (inserted as { id?: string } | null)?.id ?? null
  }

  try {
    await admin.from('travel_booking_records').insert({
      user_id: input.userId,
      product_type: 'flight',
      status,
      provider_booking_id: reference || null,
      provider_booking_ref: reference || null,
      source: 'web',
      origin: flightRow.origin,
      destination: flightRow.destination,
      currency: currency.toUpperCase(),
      amount,
      provider_payload: asJsonObject(input.providerPayload),
    })
  } catch {
    // Audit visibility is useful for support, but canonical booking success is controlled above.
  }

  return {
    bookingId,
    tripItemId,
    localStatus: bookingId && tripItemId && localErrors.length === 0 ? 'saved' : 'failed',
    localError: localErrors.length > 0 ? localErrors.join('; ') : null,
    amount,
    currency,
  }
}

function errorMessage(error: unknown): string {
  if (!error) return 'Unknown database error'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  const message = asRecord(error).message
  return typeof message === 'string' && message.trim() ? message : 'Unknown database error'
}

function firstRecord(value: unknown): JsonRecord {
  const data = asRecord(value).data ?? value
  if (Array.isArray(data)) return asRecord(data[0])
  return asRecord(data)
}

function bookingRef(data: JsonRecord): string {
  return findFirstString(data, [
    'bookingId',
    'booking_id',
    'bookingRef',
    'booking_reference',
    'reference',
    'pnr',
    'orderId',
    'id',
  ])
}

function normalizedStatus(data: JsonRecord): 'pending' | 'confirmed' | 'failed' | 'cancelled' {
  const raw = findFirstString(data, ['status', 'bookingStatus', 'providerStatus']).toLowerCase()
  if (['confirmed', 'booked', 'ticketed', 'success', 'succeeded'].includes(raw)) return 'confirmed'
  if (['failed', 'error'].includes(raw)) return 'failed'
  if (['cancelled', 'canceled', 'refunded'].includes(raw)) return 'cancelled'
  return 'pending'
}

function flightSummary(data: JsonRecord) {
  const journey = asRecord(data.journey ?? data.itinerary ?? data.flight)
  const segments = firstArray(data.segments, data.legs, data.flights, journey.segments, journey.legs, journey.flights).map(asRecord)
  const first = segments[0] ?? journey
  const last = segments[segments.length - 1] ?? journey
  return {
    origin: airportCode(first.departure ?? first.origin ?? first.departureAirport ?? first.departure_airport),
    destination: airportCode(last.arrival ?? last.destination ?? last.arrivalAirport ?? last.arrival_airport),
    departureAt: first.departureTime ?? first.departureAt ?? first.departure_at ?? first.departsAt,
    arrivalAt: last.arrivalTime ?? last.arrivalAt ?? last.arrival_at ?? last.arrivesAt,
    airline: stringValue(first.airlineName ?? first.airline ?? first.marketingCarrier ?? first.carrier),
  }
}

function moneyAmount(providerBooking: JsonRecord, requestBody: JsonRecord): number {
  const price = asRecord(providerBooking.price ?? providerBooking.totalPrice ?? providerBooking.total_price)
  return numberValue(
    price.amount
      ?? providerBooking.amount
      ?? providerBooking.total
      ?? requestBody.amount
  )
}

function moneyCurrency(providerBooking: JsonRecord, requestBody: JsonRecord): string {
  const price = asRecord(providerBooking.price ?? providerBooking.totalPrice ?? providerBooking.total_price)
  return stringValue(price.currency ?? providerBooking.currency ?? requestBody.currency, 'USD')
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

function findFirstString(data: unknown, keys: string[]): string {
  if (!data || typeof data !== 'object') return ''
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findFirstString(item, keys)
      if (result) return result
    }
    return ''
  }

  const record = data as JsonRecord
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  for (const value of Object.values(record)) {
    const result = findFirstString(value, keys)
    if (result) return result
  }

  return ''
}

function asJsonObject(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : { data: value }
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

function isoOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
