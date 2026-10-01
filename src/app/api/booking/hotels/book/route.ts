import { NextResponse } from 'next/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getHotelPrebookQuote } from '@/lib/travel-booking/hotel-prebook'
import { retrievePaymentIntent, verifyPaymentIntentForBooking } from '@/lib/stripe/payment-intents'

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

    const admin = createAdminClient()

    // 1. A PaymentIntent pays for exactly one provider booking.
    if (await paymentIntentAlreadyBooked(admin ?? supabase, paymentIntentId)) {
      return NextResponse.json({
        error: 'This payment is already linked to a confirmed booking. Check your trip for the confirmation.',
        code: 'payment_already_used',
      }, { status: 409 })
    }

    // 2. Price comes from the provider's prebook, never from the request body.
    const quote = await getHotelPrebookQuote(prebookId)
    if (!quote) {
      console.error('[hotels/book] prebook quote unavailable', { prebookId })
      return NextResponse.json({
        error: 'We could not confirm the price for this stay, so no booking was placed. Please search again.',
        code: 'prebook_price_unavailable',
      }, { status: 409 })
    }

    // 3. Verify the payment with Stripe before charging the company account.
    const retrieved = await retrievePaymentIntent(paymentIntentId)
    if (!retrieved.ok) {
      console.error('[hotels/book] payment intent retrieval failed', { reason: retrieved.reason })
      if (retrieved.reason === 'not_found') {
        return NextResponse.json({
          error: 'We could not find a completed payment for this booking, so no booking was placed.',
          code: 'payment_not_found',
        }, { status: 402 })
      }
      return NextResponse.json({
        error: 'We could not verify your payment right now, so no booking was placed. Please try again in a few minutes or contact support@bahabuddy.com.',
        code: 'payment_verification_unavailable',
      }, { status: 503 })
    }

    const verification = verifyPaymentIntentForBooking(retrieved.paymentIntent, {
      userId: user.id,
      tripId,
      prebookId,
      minimumAmountCents: quote.amountCents,
      currency: quote.currency,
    })
    if (!verification.ok) {
      console.error('[hotels/book] payment verification rejected', {
        code: verification.code,
        paymentIntentId,
        prebookId,
        expectedCents: quote.amountCents,
      })
      return NextResponse.json({ error: verification.error, code: verification.code }, { status: verification.status })
    }

    let result: Awaited<ReturnType<typeof callTravelProvider>>
    try {
      result = await callTravelProvider('/rates/book', {
        prebookId,
        holder,
        guests,
        payment: { method: 'ACC_CREDIT_CARD' },
      }, { useBookBase: true })
    } catch (error) {
      // The traveller has already paid. Refunds need a human decision, so record
      // the paid-but-unbooked state for support and tell the traveller clearly.
      getProviderErrorResponse(error) // logs the raw provider failure server-side
      await recordPaidBookingFailure(admin, {
        userId: user.id,
        tripId,
        paymentIntentId,
        prebookId,
        amountCents: verification.amountCents,
        currency: verification.currency,
        error,
      })
      return NextResponse.json({
        error: `Your payment went through, but the hotel could not confirm this booking, so you are not booked. Our team has been alerted and will contact you about a refund or an alternative. You can also email support@bahabuddy.com with payment reference ${paymentIntentId}.`,
        code: 'paid_booking_failed',
        paymentStatus: 'paid',
        supportRequired: true,
        paymentReference: paymentIntentId,
      }, { status: 502 })
    }

    const booking = asRecord(asRecord(result.data).data ?? result.data)
    const persisted = await persistHotelBooking({
      admin,
      userId: user.id,
      tripId,
      paymentIntentId,
      providerPayload: result.data,
      providerBooking: booking,
      requestBody: asRecord(body),
      guestCount: guests.length,
      prebookId,
      paidAmount: verification.amountCents / 100,
      paidCurrency: verification.currency,
    })

    const responseStatus = persisted.localStatus === 'failed' ? 202 : result.status

    return NextResponse.json({
      bookingId: booking.bookingId ?? persisted.bookingId,
      tripId,
      tripItemId: persisted.tripItemId,
      provider: 'hotel_liteapi',
      providerReference: booking.hotelConfirmationCode ?? booking.bookingId ?? null,
      paymentStatus: 'paid',
      providerStatus: persisted.providerStatus,
      localStatus: persisted.localStatus,
      localError: persisted.localError,
      supportRequired: persisted.localStatus === 'failed',
      amount: persisted.amount,
      currency: persisted.currency,
      sourceSurface: 'web',
      hotelConfirmationCode: booking.hotelConfirmationCode ?? null,
      status: booking.status ?? 'PENDING',
      checkin: booking.checkin ?? body.checkin ?? null,
      checkout: booking.checkout ?? body.checkout ?? null,
      bookingRecordId: persisted.bookingId,
    }, { status: responseStatus })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json({ error: response.error, details: response.details }, { status: response.status })
  }
}

type BookingsReader = {
  from: (table: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}

async function paymentIntentAlreadyBooked(client: BookingsReader, paymentIntentId: string): Promise<boolean> {
  const { data, error } = await client
    .from('bookings')
    .select('id, status, booking_ref')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .limit(10)
  if (error) {
    // Fail closed: without this check one payment could fund several bookings.
    console.error('[hotels/book] payment reuse lookup failed', errorMessage(error))
    return true
  }
  const rows = Array.isArray(data) ? data as Array<{ status?: string | null; booking_ref?: string | null }> : []
  return rows.some((row) => row.status === 'confirmed' || Boolean(row.booking_ref))
}

async function recordPaidBookingFailure(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    userId: string
    tripId: string
    paymentIntentId: string
    prebookId: string
    amountCents: number
    currency: string
    error: unknown
  },
) {
  const failure = {
    source_surface: 'web',
    prebook_id: input.prebookId,
    failure_stage: 'provider_book_after_payment',
    needs_refund_review: true,
    provider_error: errorMessage(input.error).slice(0, 500),
    failed_at: new Date().toISOString(),
  }
  console.error('[hotels/book] PAID BOOKING FAILED — support follow-up required', {
    paymentIntentId: input.paymentIntentId,
    prebookId: input.prebookId,
    userId: input.userId,
    amountCents: input.amountCents,
  })
  if (!admin) return
  try {
    const { data: existing, error: lookupError } = await admin
      .from('bookings')
      .select('id, financial_metadata')
      .eq('stripe_payment_intent_id', input.paymentIntentId)
      .eq('user_id', input.userId)
      .limit(10)
    if (lookupError) throw lookupError
    const rows = Array.isArray(existing) ? existing as Array<{ id: string; financial_metadata?: unknown }> : []
    for (const row of rows) {
      const { error: updateError } = await admin
        .from('bookings')
        .update({ status: 'failed', financial_metadata: { ...asRecord(row.financial_metadata), ...failure } })
        .eq('id', row.id)
      if (updateError) throw updateError
    }
    if (rows.length === 0) {
      const { error: insertError } = await admin.from('bookings').insert({
        user_id: input.userId,
        trip_id: input.tripId,
        booking_type: 'accommodation',
        type: 'hotel',
        provider: 'liteapi',
        status: 'failed',
        amount: input.amountCents / 100,
        amount_cents: input.amountCents,
        currency: input.currency,
        stripe_payment_intent_id: input.paymentIntentId,
        financial_metadata: failure,
      })
      if (insertError) throw insertError
    }
  } catch (error) {
    console.error('[hotels/book] could not record paid booking failure', errorMessage(error))
  }
}

async function persistHotelBooking(input: {
  admin: ReturnType<typeof createAdminClient>
  userId: string
  tripId: string
  paymentIntentId: string
  providerPayload: unknown
  providerBooking: Record<string, unknown>
  requestBody: Record<string, unknown>
  guestCount: number
  prebookId: string
  paidAmount: number
  paidCurrency: string
}): Promise<{
  bookingId: string | null
  tripItemId: string | null
  providerStatus: 'confirmed' | 'pending' | 'failed' | 'cancelled'
  localStatus: 'saved' | 'failed'
  localError: string | null
  amount: number
  currency: string
}> {
  const admin = input.admin

  const bookingRef = stringValue(input.providerBooking.bookingId)
  const externalRef = stringValue(input.providerBooking.hotelConfirmationCode)
  const amount = totalAmount(input.providerBooking) ?? input.paidAmount
  const currency = stringValue(input.providerBooking.currency, input.paidCurrency).toLowerCase()
  const providerStatus = String(input.providerBooking.status ?? '').toUpperCase()
  const status = normalizedProviderStatus(providerStatus)
  if (!admin) {
    return {
      bookingId: null,
      tripItemId: null,
      providerStatus: status,
      localStatus: 'failed',
      localError: 'Admin database client is unavailable.',
      amount,
      currency,
    }
  }
  const localErrors: string[] = []

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
    const { error } = await admin.from('bookings').update(bookingRecord).eq('id', bookingId)
    if (error) localErrors.push(`bookings update failed: ${errorMessage(error)}`)
  } else {
    const { data, error } = await admin.from('bookings').insert(bookingRecord).select('id').single()
    if (error) localErrors.push(`bookings insert failed: ${errorMessage(error)}`)
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
    const { data: updated, error } = await admin
      .from('trip_accommodations')
      .update(accommodation)
      .eq('id', requestedTripItemId)
      .eq('trip_id', input.tripId)
      .select('id')
      .maybeSingle()
    if (error) localErrors.push(`trip_accommodations update failed: ${errorMessage(error)}`)
    tripItemId = (updated as { id?: string } | null)?.id ?? null
  }

  if (!tripItemId) {
    const { data: tripItem, error } = await admin
      .from('trip_accommodations')
      .insert(accommodation)
      .select('id')
      .single()
    if (error) localErrors.push(`trip_accommodations insert failed: ${errorMessage(error)}`)
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
    localStatus: bookingId && tripItemId && localErrors.length === 0 ? 'saved' : 'failed',
    localError: localErrors.length > 0 ? localErrors.join('; ') : null,
    amount,
    currency: currency.toUpperCase(),
  }
}

function errorMessage(error: unknown): string {
  if (!error) return 'Unknown database error'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  const message = asRecord(error).message
  return typeof message === 'string' && message.trim() ? message : 'Unknown database error'
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
