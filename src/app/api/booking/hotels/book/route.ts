import { NextResponse } from 'next/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Guest = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  occupancyNumber?: number
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication is required to book a hotel.' }, { status: 401 })
    }

    const body = await request.json()
    const tripId = stringValue(body.tripId ?? body.trip_id)
    const prebookId = stringValue(body.prebookId ?? body.prebook_id)
    const paymentIntentId = stringValue(body.paymentIntentId ?? body.stripe_payment_intent_id)
    const holder = normalizeGuest(body.holder)
    const guests = normalizeGuests(body.guests, holder)

    if (!tripId || !prebookId || !paymentIntentId || !holder || guests.length === 0) {
      return NextResponse.json({
        error: 'tripId, prebookId, paymentIntentId, holder, and guests are required.',
      }, { status: 400 })
    }

    const { data: trip } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!trip) return NextResponse.json({ error: 'Trip not found.' }, { status: 404 })

    const result = await callTravelProvider('/rates/book', {
      prebookId,
      holder,
      guests,
      payment: { method: 'ACC_CREDIT_CARD' },
    }, { useBookBase: true })

    const booking = asRecord(asRecord(result.data).data ?? result.data)
    const persisted = await persistHotelBooking({
      userId: user.id,
      tripId,
      paymentIntentId,
      providerPayload: result.data,
      providerBooking: booking,
      requestBody: asRecord(body),
      guestCount: guests.length,
      prebookId,
    })

    return NextResponse.json({
      bookingId: booking.bookingId ?? persisted.bookingId,
      tripId,
      tripItemId: persisted.tripItemId,
      provider: 'hotel_liteapi',
      providerReference: booking.hotelConfirmationCode ?? booking.bookingId ?? null,
      paymentStatus: 'paid',
      providerStatus: persisted.providerStatus,
      amount: persisted.amount,
      currency: persisted.currency,
      sourceSurface: 'web',
      hotelConfirmationCode: booking.hotelConfirmationCode ?? null,
      status: booking.status ?? 'PENDING',
      checkin: booking.checkin ?? body.checkin ?? null,
      checkout: booking.checkout ?? body.checkout ?? null,
      bookingRecordId: persisted.bookingId,
      raw: result.data,
    }, { status: result.status })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json({ error: response.error, details: response.details }, { status: response.status })
  }
}

async function persistHotelBooking(input: {
  userId: string
  tripId: string
  paymentIntentId: string
  providerPayload: unknown
  providerBooking: Record<string, unknown>
  requestBody: Record<string, unknown>
  guestCount: number
  prebookId: string
}): Promise<{
  bookingId: string | null
  tripItemId: string | null
  providerStatus: 'confirmed' | 'pending' | 'failed' | 'cancelled'
  amount: number
  currency: string
}> {
  const admin = createAdminClient()

  const bookingRef = stringValue(input.providerBooking.bookingId)
  const externalRef = stringValue(input.providerBooking.hotelConfirmationCode)
  const amount = totalAmount(input.providerBooking) ?? numberOrNull(input.requestBody.amount) ?? 0
  const currency = stringValue(input.providerBooking.currency ?? input.requestBody.currency, 'USD').toLowerCase()
  const providerStatus = String(input.providerBooking.status ?? '').toUpperCase()
  const status = normalizedProviderStatus(providerStatus)
  if (!admin) return { bookingId: null, tripItemId: null, providerStatus: status, amount, currency }

  const bookingRecord = {
    user_id: input.userId,
    trip_id: input.tripId,
    booking_type: 'accommodation',
    type: 'hotel',
    provider: 'liteapi',
    booking_ref: bookingRef || null,
    booking_reference: externalRef || bookingRef || null,
    external_reference: externalRef || null,
    status: status === 'confirmed' ? 'confirmed' : status === 'failed' ? 'failed' : status === 'cancelled' ? 'cancelled' : 'pending',
    amount,
    amount_cents: Math.round(amount * 100),
    gross_booking_value: amount,
    currency,
    stripe_payment_intent_id: input.paymentIntentId,
    financial_metadata: {
      source_surface: 'web',
      provider_status: providerStatus || null,
      prebook_id: input.prebookId,
      hotel_id: input.providerBooking.hotelId ?? input.requestBody.hotelId ?? null,
      hotel_name: asRecord(input.providerBooking.hotel).name ?? input.requestBody.hotelName ?? null,
      checkin: input.providerBooking.checkin ?? input.requestBody.checkin ?? null,
      checkout: input.providerBooking.checkout ?? input.requestBody.checkout ?? null,
      guest_count: input.guestCount,
    },
    raw_response: asRecord(input.providerPayload),
  }

  const { data: existing } = await admin
    .from('bookings')
    .select('id')
    .eq('user_id', input.userId)
    .eq('stripe_payment_intent_id', input.paymentIntentId)
    .maybeSingle()

  let bookingId = (existing as { id?: string } | null)?.id ?? null
  if (bookingId) {
    await admin.from('bookings').update(bookingRecord).eq('id', bookingId)
  } else {
    const { data } = await admin.from('bookings').insert(bookingRecord).select('id').single()
    bookingId = (data as { id?: string } | null)?.id ?? null
  }

  const accommodation = {
    trip_id: input.tripId,
    place_id: stringValue(input.requestBody.sourceId ?? input.requestBody.hotelId) || null,
    name: stringValue(input.requestBody.hotelName ?? asRecord(input.providerBooking.hotel).name, 'Hotel'),
    island: stringValue(input.requestBody.island) || null,
    check_in: stringValue(input.providerBooking.checkin ?? input.requestBody.checkin) || null,
    check_out: stringValue(input.providerBooking.checkout ?? input.requestBody.checkout) || null,
    price_per_night: numberOrNull(input.requestBody.pricePerNight),
    guests: input.guestCount,
    booking_reference: externalRef || bookingRef || null,
    liteapi_hotel_id: stringValue(input.providerBooking.hotelId ?? input.requestBody.hotelId) || null,
    liteapi_rate_id: stringValue(input.requestBody.rateId) || null,
    liteapi_prebook_id: input.prebookId,
    stripe_payment_intent_id: input.paymentIntentId,
    status: status === 'confirmed' ? 'booked' : status === 'failed' ? 'failed' : status === 'cancelled' ? 'cancelled' : 'prebooked',
    total_price: amount,
    currency: currency.toUpperCase(),
    nights: nightsBetween(input.requestBody.checkin, input.requestBody.checkout),
    photo_url: stringValue(input.requestBody.imageUrl) || null,
  }

  const requestedTripItemId = stringValue(input.requestBody.tripItemId)
  let tripItemId: string | null = null

  if (requestedTripItemId) {
    const { data: updated } = await admin
      .from('trip_accommodations')
      .update(accommodation)
      .eq('id', requestedTripItemId)
      .eq('trip_id', input.tripId)
      .select('id')
      .maybeSingle()
    tripItemId = (updated as { id?: string } | null)?.id ?? null
  }

  if (!tripItemId) {
    const { data: tripItem } = await admin
      .from('trip_accommodations')
      .insert(accommodation)
      .select('id')
      .single()
    tripItemId = (tripItem as { id?: string } | null)?.id ?? null
  }

  try {
    await admin.from('travel_booking_records').insert({
      user_id: input.userId,
      product_type: 'hotel',
      status: status === 'confirmed' ? 'confirmed' : status,
      provider_booking_id: bookingRef || null,
      provider_booking_ref: externalRef || bookingRef || null,
      source: 'web',
      start_date: accommodation.check_in,
      end_date: accommodation.check_out,
      currency: currency.toUpperCase(),
      amount,
      provider_payload: asRecord(input.providerPayload),
    })
  } catch {
    // Audit rows help support, but they are not the traveler/admin booking source of truth.
  }

  return {
    bookingId,
    tripItemId,
    providerStatus: status,
    amount,
    currency: currency.toUpperCase(),
  }
}

function normalizeGuest(value: unknown): Required<Pick<Guest, 'firstName' | 'lastName' | 'email'>> & Pick<Guest, 'phone'> | null {
  const record = asRecord(value)
  const firstName = stringValue(record.firstName)
  const lastName = stringValue(record.lastName)
  const email = stringValue(record.email)
  if (!firstName || !lastName || !email) return null
  return { firstName, lastName, email, phone: stringValue(record.phone) || undefined }
}

function normalizeGuests(value: unknown, fallback: ReturnType<typeof normalizeGuest>): Array<Required<Pick<Guest, 'firstName' | 'lastName' | 'email'>> & Pick<Guest, 'phone' | 'occupancyNumber'>> {
  const list = Array.isArray(value) ? value : []
  const guests = list.map(normalizeGuest).filter(Boolean) as Array<Required<Pick<Guest, 'firstName' | 'lastName' | 'email'>> & Pick<Guest, 'phone'>>
  const normalized = guests.length > 0 ? guests : (fallback ? [fallback] : [])
  return normalized.map((guest, index) => ({ ...guest, occupancyNumber: index + 1 }))
}

function totalAmount(booking: Record<string, unknown>): number | null {
  const invoice = asRecord(booking.invoice)
  const price = asRecord(booking.totalPrice)
  return numberOrNull(invoice.totalAmount) ?? numberOrNull(price.amount)
}

function normalizedProviderStatus(raw: string): 'confirmed' | 'pending' | 'failed' | 'cancelled' {
  const status = raw.toLowerCase()
  if (['confirmed', 'booked', 'ticketed', 'success', 'succeeded'].includes(status)) return 'confirmed'
  if (['failed', 'error'].includes(status)) return 'failed'
  if (['cancelled', 'canceled', 'refunded'].includes(status)) return 'cancelled'
  return 'pending'
}

function nightsBetween(start: unknown, end: unknown): number | null {
  const checkin = stringValue(start)
  const checkout = stringValue(end)
  if (!checkin || !checkout) return null
  const nights = Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000)
  return nights > 0 ? nights : null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberOrNull(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}
