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
    const bookingId = String(body.bookingId ?? body.booking_id ?? '')
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required.' }, { status: 400 })
    }

    const result = await callTravelProvider(`/bookings/${encodeURIComponent(bookingId)}`, undefined, {
      method: 'GET',
    })

    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json({ error: response.error, details: response.details }, { status: response.status })
  }
}
