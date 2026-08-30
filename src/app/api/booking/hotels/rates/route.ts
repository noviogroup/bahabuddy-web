import { NextResponse } from 'next/server'
import { callTravelProvider, getProviderErrorResponse } from '@/lib/travel-booking/provider'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const hotelIds = normalizeHotelIds(body.hotelIds ?? body.hotel_ids ?? body.hotelId)
    const checkin = String(body.checkin ?? '')
    const checkout = String(body.checkout ?? '')

    if (hotelIds.length === 0 || !checkin || !checkout) {
      return NextResponse.json({ error: 'hotelIds, checkin, and checkout are required.' }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkin) || !/^\d{4}-\d{2}-\d{2}$/.test(checkout)) {
      return NextResponse.json({ error: 'Dates must use YYYY-MM-DD format.' }, { status: 400 })
    }

    if (new Date(checkin) >= new Date(checkout)) {
      return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
    }

    const result = await callTravelProvider('/hotels/rates', {
      hotelIds,
      checkin,
      checkout,
      occupancies: [{
        adults: Math.max(1, Number(body.adults ?? 2)),
        ...(Array.isArray(body.children) && body.children.length ? { children: body.children } : {}),
      }],
      currency: String(body.currency ?? 'USD').toUpperCase(),
      guestNationality: String(body.guestNationality ?? 'US').toUpperCase(),
    })

    return NextResponse.json({
      rates: shapeRates(result.data),
      checkin,
      checkout,
      nights: nightsBetween(checkin, checkout),
      raw: result.data,
    }, { status: result.status })
  } catch (error) {
    const response = getProviderErrorResponse(error)
    return NextResponse.json({ error: response.error, details: response.details }, { status: response.status })
  }
}

function normalizeHotelIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean).slice(0, 8)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function shapeRates(data: unknown) {
  const record = asRecord(data)
  const hotels = Array.isArray(record.data) ? record.data.map(asRecord) : []
  return hotels.map((hotel) => {
    const roomTypes = Array.isArray(hotel.roomTypes) ? hotel.roomTypes.map(asRecord) : []
    return {
      hotel_id: stringValue(hotel.hotelId),
      currency: stringValue(hotel.currency, 'USD'),
      cheapest_total: cheapestTotal(roomTypes),
      rooms: roomTypes.slice(0, 8).map(shapeRoom).filter((room) => room.rate_id),
    }
  })
}

function shapeRoom(room: Record<string, unknown>) {
  const rates = Array.isArray(room.rates) ? room.rates.map(asRecord) : []
  const rate = rates[0] ?? {}
  const offerRetail = asRecord(room.offerRetailRate)
  const retail = asRecord(rate.retailRate)
  const totals = Array.isArray(retail.total) ? retail.total.map(asRecord) : []
  const cancellation = asRecord(rate.cancellationPolicies)
  return {
    room_type_id: stringValue(rate.roomTypeId ?? room.roomTypeId),
    name: stringValue(rate.name ?? room.name, 'Room'),
    max_occupancy: numberOrNull(rate.maxOccupancy),
    board_type: stringValue(rate.boardType),
    refundable: cancellation.refundableTag !== 'NRFN',
    total_price: numberOrNull(offerRetail.amount ?? totals[0]?.amount),
    currency: stringValue(offerRetail.currency ?? totals[0]?.currency, 'USD'),
    rate_id: stringValue(room.offerId),
    offer_id: stringValue(room.offerId),
    image_urls: extractRoomImageUrls([room, rate]).slice(0, 4),
    cancellation_summary: cancellationSummary(cancellation),
  }
}

function cheapestTotal(rooms: Record<string, unknown>[]): number | null {
  let cheapest: number | null = null
  for (const room of rooms) {
    const value = numberOrNull(asRecord(room.offerRetailRate).amount)
    if (value !== null && (cheapest === null || value < cheapest)) cheapest = value
  }
  return cheapest
}

function cancellationSummary(cancellation: Record<string, unknown>): string | null {
  const infos = Array.isArray(cancellation.cancelPolicyInfos) ? cancellation.cancelPolicyInfos.map(asRecord) : []
  const first = infos[0]
  if (!first) return null
  const amount = numberOrNull(first.amount)
  const currency = stringValue(first.currency, 'USD')
  const cancelTime = stringValue(first.cancelTime)
  if (amount === null) return cancelTime ? `Cancellation terms change after ${cancelTime}` : null
  if (amount === 0 && cancelTime) return `Free cancellation until ${cancelTime}`
  return cancelTime ? `${currency} ${amount.toFixed(2)} cancellation fee after ${cancelTime}` : `${currency} ${amount.toFixed(2)} cancellation fee`
}

function nightsBetween(checkin: string, checkout: string): number {
  return Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function numberOrNull(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function extractRoomImageUrls(value: unknown): string[] {
  const urls = new Set<string>()
  collectRoomImageUrls(value, urls)
  return Array.from(urls)
}

function collectRoomImageUrls(value: unknown, urls: Set<string>, depth = 0, allowString = false) {
  if (depth > 6 || value == null) return

  if (typeof value === 'string') {
    const url = validImageUrl(value)
    if (allowString && url) urls.add(url)
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) collectRoomImageUrls(item, urls, depth + 1, allowString)
    return
  }

  if (typeof value !== 'object') return

  const record = value as Record<string, unknown>
  for (const [key, nested] of Object.entries(record)) {
    if (isPropertyImageField(key)) continue
    if (isDirectImageUrlField(key)) {
      collectRoomImageUrls(nested, urls, depth + 1, true)
      continue
    }
    if (isRoomImageCollectionField(key)) {
      collectRoomImageUrls(nested, urls, depth + 1, true)
    }
  }
}

function isDirectImageUrlField(key: string): boolean {
  return /^(url|urlHd|urlHD|imageUrl|image_url|photoUrl|photo_url|src|thumbnail)$/i.test(key)
}

function isRoomImageCollectionField(key: string): boolean {
  return /^(roomImages|room_images|roomImageUrls|room_image_urls|images|imageUrls|image_urls|photos|photoUrls|gallery|media|thumbnails)$/i.test(key)
}

function isPropertyImageField(key: string): boolean {
  return /hotel|property|exterior|amenit|destination/i.test(key)
}

function validImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const url = value.trim()
  if (!/^https?:\/\//i.test(url)) return null
  try {
    const parsed = new URL(url)
    return /\.(?:avif|jpe?g|png|webp)$/i.test(parsed.pathname)
      || /(?:cupid\.travel|liteapi|giata|cloudfront|cloudinary|images?|photos?|media|cdn)/i.test(`${parsed.hostname}${parsed.pathname}`)
      ? url
      : null
  } catch {
    return null
  }
}
