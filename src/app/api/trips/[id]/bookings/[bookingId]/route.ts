import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
type ProviderStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled'

export async function GET(
  _request: Request,
  { params }: { params: { id: string; bookingId: string } },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  }

  const tripId = params.id
  const bookingId = params.bookingId

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (tripError) return NextResponse.json({ error: tripError.message }, { status: 500 })
  if (!trip) return NextResponse.json({ error: 'Trip not found.' }, { status: 404 })

  const booking = await loadBooking(supabase, user.id, tripId, bookingId)
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }

  const provider = providerForBooking(booking)
  const providerRow = await loadProviderRow(supabase, tripId, booking)
  const providerReference = providerRow?.booking_reference
    ?? booking.external_reference
    ?? booking.booking_reference
    ?? booking.booking_ref
    ?? null

  const paymentStatus = paymentStatusForBooking(booking)
  const providerStatus = providerStatusFor(providerReference, providerRow?.status, booking.status)

  return NextResponse.json({
    tripId,
    tripItemId: providerRow?.id ?? null,
    bookingId: booking.id,
    provider,
    providerReference,
    paymentStatus,
    providerStatus,
    amount: booking.amount ?? null,
    currency: booking.currency ?? 'usd',
    sourceSurface: sourceSurfaceFor(booking),
    booking,
    providerRow,
    reconciled: paymentStatus === 'paid' && providerStatus === 'confirmed' && Boolean(providerReference),
  })
}

type SupabaseLike = Awaited<ReturnType<typeof createClient>>

type BookingRecord = {
  id: string
  trip_id: string | null
  user_id: string | null
  booking_type?: string | null
  type?: string | null
  provider?: string | null
  status?: string | null
  amount?: number | null
  currency?: string | null
  paid_at?: string | null
  stripe_payment_intent_id?: string | null
  booking_ref?: string | null
  booking_reference?: string | null
  external_reference?: string | null
  financial_metadata?: Record<string, unknown> | null
  raw_response?: Record<string, unknown> | null
}

type ProviderRow = {
  id?: string
  status?: string | null
  booking_reference?: string | null
  stripe_payment_intent_id?: string | null
}

async function loadBooking(
  supabase: SupabaseLike,
  userId: string,
  tripId: string,
  bookingId: string,
): Promise<BookingRecord | null> {
  const fields = [
    'id',
    'trip_id',
    'user_id',
    'booking_type',
    'type',
    'provider',
    'status',
    'amount',
    'currency',
    'paid_at',
    'stripe_payment_intent_id',
    'booking_ref',
    'booking_reference',
    'external_reference',
    'financial_metadata',
    'raw_response',
  ].join(', ')

  const base = supabase
    .from('bookings')
    .select(fields)
    .eq('user_id', userId)
    .eq('trip_id', tripId)

  const { data: byId } = await base.eq('id', bookingId).maybeSingle()
  if (byId) return byId as unknown as BookingRecord

  const { data: byPaymentIntent } = await supabase
    .from('bookings')
    .select(fields)
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .eq('stripe_payment_intent_id', bookingId)
    .maybeSingle()
  if (byPaymentIntent) return byPaymentIntent as unknown as BookingRecord

  const { data: byProviderRef } = await supabase
    .from('bookings')
    .select(fields)
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .or(`booking_ref.eq.${bookingId},booking_reference.eq.${bookingId},external_reference.eq.${bookingId}`)
    .maybeSingle()

  return (byProviderRef as unknown as BookingRecord | null) ?? null
}

async function loadProviderRow(
  supabase: SupabaseLike,
  tripId: string,
  booking: BookingRecord,
): Promise<ProviderRow | null> {
  const kind = providerForBooking(booking)
  const paymentIntentId = booking.stripe_payment_intent_id

  if (kind === 'hotel_liteapi') {
    const { data } = await supabase
      .from('trip_accommodations')
      .select('id, status, booking_reference')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(20)

    return pickProviderRow(data as unknown as ProviderRow[] | null, paymentIntentId, booking)
  }

  if (kind === 'flight_liteapi' || kind === 'flight_duffel') {
    const { data } = await supabase
      .from('trip_flights')
      .select('id, booking_reference')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(20)

    return pickProviderRow(data as unknown as ProviderRow[] | null, paymentIntentId, booking)
  }

  return null
}

function pickProviderRow(
  rows: ProviderRow[] | null,
  paymentIntentId: string | null | undefined,
  booking: BookingRecord,
): ProviderRow | null {
  if (!rows?.length) return null
  if (paymentIntentId) {
    const exact = rows.find((row) => row.stripe_payment_intent_id === paymentIntentId)
    if (exact) return exact
  }
  const refs = [booking.booking_ref, booking.booking_reference, booking.external_reference].filter(Boolean)
  const byRef = rows.find((row) => row.booking_reference && refs.includes(row.booking_reference))
  return byRef ?? rows.find((row) => row.booking_reference) ?? rows[0]
}

function providerForBooking(booking: BookingRecord): string {
  const raw = `${booking.provider ?? ''}:${booking.booking_type ?? booking.type ?? ''}`.toLowerCase()
  if (raw.includes('hotel') || raw.includes('accommodation') || raw.includes('liteapi:accommodation')) return 'hotel_liteapi'
  if (raw.includes('duffel')) return 'flight_duffel'
  if (raw.includes('flight')) return 'flight_liteapi'
  return booking.provider ?? 'other'
}

function paymentStatusForBooking(booking: BookingRecord): PaymentStatus {
  const status = (booking.status ?? '').toLowerCase()
  if (booking.paid_at || status === 'confirmed' || status === 'paid') return 'paid'
  if (status === 'failed') return 'failed'
  if (status === 'cancelled' || status === 'canceled') return 'cancelled'
  if (status === 'refunded') return 'refunded'
  return 'pending'
}

function providerStatusFor(
  providerReference: string | null,
  providerRowStatus: string | null | undefined,
  bookingStatus: string | null | undefined,
): ProviderStatus {
  const status = (providerRowStatus ?? bookingStatus ?? '').toLowerCase()
  if (providerReference && !['failed', 'cancelled', 'canceled'].includes(status)) return 'confirmed'
  if (status === 'failed') return 'failed'
  if (status === 'cancelled' || status === 'canceled') return 'cancelled'
  return 'pending'
}

function sourceSurfaceFor(booking: BookingRecord): string {
  const metadata = booking.financial_metadata ?? {}
  const source = metadata.source_surface ?? metadata.source ?? metadata.surface
  return typeof source === 'string' && source.trim() ? source : 'web'
}
