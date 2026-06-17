import { NextResponse } from 'next/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication is required to prebook a hotel.' }, { status: 401 })
    }

    const body = await request.json()
    const rateId = String(body.rateId ?? body.rate_id ?? '')
    if (!rateId) {
      return NextResponse.json({ error: 'rateId is required.' }, { status: 400 })
    }

    const result = await callTravelProvider('/rates/prebook', {
      offerId: rateId,
      usePaymentSdk: false,
    }, { useBookBase: true })

    const data = asRecord(asRecord(result.data).data ?? result.data)
    return NextResponse.json({
      prebookId: data.prebookId ?? data.prebook_id,
      offerId: data.offerId ?? rateId,
      hotelId: data.hotelId ?? body.hotelId ?? body.hotel_id ?? null,
      checkin: data.checkin ?? body.checkin ?? null,
      checkout: data.checkout ?? body.checkout ?? null,
      currency: data.currency ?? body.currency ?? 'USD',
      termsAndConditions: data.termsAndConditions ?? null,
      raw: result.data,
    }, { status: result.status })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json({ error: response.error, details: response.details }, { status: response.status })
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
