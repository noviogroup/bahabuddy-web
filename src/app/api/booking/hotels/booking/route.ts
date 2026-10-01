import { NextResponse } from 'next/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
    }

    const body = await request.json()
    const bookingId = String(body.bookingId ?? body.booking_id ?? '').trim()
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required.' }, { status: 400 })
    }

    // Only look up provider bookings that belong to the signed-in traveller.
    const { data: owned } = await supabase
      .from('bookings')
      .select('id')
      .eq('user_id', user.id)
      .eq('booking_ref', bookingId)
      .maybeSingle()
    if (!owned) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    const result = await callTravelProvider(`/bookings/${encodeURIComponent(bookingId)}`, undefined, {
      method: 'GET',
      useBookBase: true,
    })

    const root = asRecord(result.data)
    const booking = asRecord(root.data ?? root)
    const hotel = asRecord(booking.hotel)
    const price = asRecord(booking.price)
    return NextResponse.json({
      bookingId: booking.bookingId ?? bookingId,
      status: booking.status ?? null,
      hotelConfirmationCode: booking.hotelConfirmationCode ?? null,
      checkin: booking.checkin ?? null,
      checkout: booking.checkout ?? null,
      hotel: { id: hotel.hotelId ?? booking.hotelId ?? null, name: hotel.name ?? null },
      price: booking.price !== undefined && typeof booking.price !== 'object' ? booking.price : price.amount ?? null,
      currency: booking.currency ?? price.currency ?? null,
      cancellationPolicies: booking.cancellationPolicies ?? null,
    }, { status: result.status })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json({ error: response.error }, { status: response.status })
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
