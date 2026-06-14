import { NextResponse } from 'next/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const prebookId = String(body.prebookId ?? '')

    if (!prebookId) {
      return NextResponse.json({ error: 'prebookId is required.' }, { status: 400 })
    }

    const result = await callTravelProvider('/flights/bookings', body)
    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json(
      { error: response.error, details: response.details },
      { status: response.status }
    )
  }
}
