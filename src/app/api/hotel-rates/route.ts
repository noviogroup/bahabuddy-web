import { NextRequest, NextResponse } from 'next/server'

const LITEAPI_BASE = 'https://api.liteapi.travel/v3.0'

export async function POST(req: NextRequest) {
  const apiKey = process.env.LITEAPI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Hotel rates service not configured.' },
      { status: 503 },
    )
  }

  let body: { hotelId?: string; checkin?: string; checkout?: string; adults?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { hotelId, checkin, checkout, adults } = body
  if (!hotelId || !checkin || !checkout) {
    return NextResponse.json(
      { error: 'Missing required fields: hotelId, checkin, checkout.' },
      { status: 400 },
    )
  }

  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRe.test(checkin) || !dateRe.test(checkout)) {
    return NextResponse.json(
      { error: 'Dates must be in YYYY-MM-DD format.' },
      { status: 400 },
    )
  }

  if (new Date(checkin) >= new Date(checkout)) {
    return NextResponse.json(
      { error: 'Check-out must be after check-in.' },
      { status: 400 },
    )
  }

  const guestCount = adults && adults >= 1 && adults <= 10 ? adults : 2

  try {
    const params = new URLSearchParams({
      hotelIds: hotelId,
      checkin,
      checkout,
      adults: String(guestCount),
      currency: 'USD',
    })

    const res = await fetch(`${LITEAPI_BASE}/hotels/rates?${params.toString()}`, {
      headers: {
        'X-API-Key': apiKey,
        Accept: 'application/json',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[hotel-rates] LiteAPI error', res.status, text)
      return NextResponse.json(
        { error: 'Unable to fetch rates at this time.' },
        { status: 502 },
      )
    }

    const data = await res.json()

    const rooms = extractRooms(data)

    return NextResponse.json({ rooms })
  } catch (err) {
    console.error('[hotel-rates] fetch error', err)
    return NextResponse.json(
      { error: 'Internal error checking rates.' },
      { status: 500 },
    )
  }
}

interface RoomRate {
  roomName: string
  boardName: string
  currency: string
  totalRate: number
  nightlyRate: number
  cancellationPolicy?: string
  bookingUrl?: string
}

function extractRooms(data: Record<string, unknown>): RoomRate[] {
  const rooms: RoomRate[] = []

  // LiteAPI rates response varies; handle the common shapes
  const hotelData = Array.isArray(data.data) ? data.data : data.data ? [data.data] : []

  for (const hotel of hotelData as Record<string, unknown>[]) {
    const roomTypes = (hotel.roomTypes ?? hotel.rooms ?? []) as Record<string, unknown>[]
    for (const rt of roomTypes) {
      const rates = (rt.rates ?? rt.offers ?? [rt]) as Record<string, unknown>[]
      for (const rate of rates) {
        const totalRate = Number(rate.totalRate ?? rate.total ?? rate.price ?? 0)
        if (totalRate <= 0) continue

        const nightlyRate = Number(rate.nightlyRate ?? rate.avgNightly ?? 0) || totalRate

        rooms.push({
          roomName: String(rt.name ?? rt.roomName ?? rate.roomName ?? 'Standard Room'),
          boardName: String(rate.boardName ?? rate.mealPlan ?? rate.board ?? ''),
          currency: String(rate.currency ?? hotel.currency ?? 'USD'),
          totalRate,
          nightlyRate,
          cancellationPolicy: rate.cancellationPolicy
            ? String(
                typeof rate.cancellationPolicy === 'object'
                  ? (rate.cancellationPolicy as Record<string, unknown>).description ?? 'See terms'
                  : rate.cancellationPolicy,
              )
            : undefined,
          bookingUrl: rate.bookingUrl ? String(rate.bookingUrl) : undefined,
        })
      }
    }
  }

  rooms.sort((a, b) => a.totalRate - b.totalRate)

  return rooms
}
