import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const offerId = typeof body.offerId === 'string' ? body.offerId.trim() : ''

  if (!offerId) {
    return NextResponse.json({ error: 'offerId is required.' }, { status: 400 })
  }

  return NextResponse.json(
    {
      error: 'LiteAPI flight fare verification happens during prebook.',
      nextStep: 'POST /api/booking/flights/prebook with traveler and passport details.',
    },
    { status: 409 },
  )
}
