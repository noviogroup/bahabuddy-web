import { parseStayTravelerType, type StayTravelerType } from '@/lib/stay-traveler-types'

export type StaySortMode = 'rating' | 'stars'

export type StaySearchParamsInput = {
  island?: string
  city?: string
  type?: string
  traveler_type?: string
  stars?: string
  guest_rating?: string
  amenities?: string
  sort?: string
  checkin?: string
  checkout?: string
  adults?: string
  children?: string
  rooms?: string
}

export type StaySearchParams = {
  island: string
  city: string
  type: string
  travelerType: StayTravelerType | ''
  minStars?: number
  minGuestRating?: number
  amenities: string[]
  sort: StaySortMode
  checkin: string
  checkout: string
  adults?: number
  children?: number
  rooms?: number
}

export type StaySearchParamOverrides = Partial<{
  island: string
  city: string
  type: string
  traveler_type: string
  stars: string
  guest_rating: string
  amenities: string
  sort: string
  checkin: string
  checkout: string
  adults: string
  children: string
  rooms: string
}>

const ORDERED_KEYS: Array<keyof StaySearchParamsInput> = [
  'island',
  'city',
  'type',
  'traveler_type',
  'stars',
  'guest_rating',
  'amenities',
  'sort',
  'checkin',
  'checkout',
  'adults',
  'children',
  'rooms',
]

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

function cleanString(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseBoundedInt(value: string | undefined, min: number, max: number): number | undefined {
  const parsed = Number.parseInt(cleanString(value), 10)
  if (!Number.isFinite(parsed)) return undefined
  if (parsed < min || parsed > max) return undefined
  return parsed
}

function parseDelimitedList(value: string | undefined): string[] {
  return cleanString(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function dateLabel(value: string): string {
  return DATE_FORMAT.format(new Date(`${value}T00:00:00Z`))
}

export function readStaySearchParams(input: StaySearchParamsInput): StaySearchParams {
  const minStars = parseBoundedInt(input.stars, 1, 5)
  const minGuestRating = parseBoundedInt(input.guest_rating, 1, 10)
  const adults = parseBoundedInt(input.adults, 1, 20)
  const children = parseBoundedInt(input.children, 0, 20)
  const rooms = parseBoundedInt(input.rooms, 1, 10)
  const checkin = cleanString(input.checkin)
  const checkout = cleanString(input.checkout)

  return {
    island: cleanString(input.island),
    city: cleanString(input.city),
    type: cleanString(input.type),
    travelerType: parseStayTravelerType(input.traveler_type),
    minStars,
    minGuestRating,
    amenities: parseDelimitedList(input.amenities),
    sort: input.sort === 'rating' ? 'rating' : 'stars',
    checkin: isIsoDate(checkin) ? checkin : '',
    checkout: isIsoDate(checkout) ? checkout : '',
    adults,
    children,
    rooms,
  }
}

export function staySearchUrl(
  current: StaySearchParams,
  overrides: StaySearchParamOverrides,
): string {
  const merged: StaySearchParamsInput = {
    island: current.island,
    city: current.city,
    type: current.type,
    traveler_type: current.travelerType || undefined,
    stars: current.minStars ? String(current.minStars) : undefined,
    guest_rating: current.minGuestRating ? String(current.minGuestRating) : undefined,
    amenities: current.amenities.length > 0 ? current.amenities.join(',') : undefined,
    sort: current.sort === 'rating' ? 'rating' : undefined,
    checkin: current.checkin,
    checkout: current.checkout,
    adults: current.adults ? String(current.adults) : undefined,
    children: current.children != null ? String(current.children) : undefined,
    rooms: current.rooms ? String(current.rooms) : undefined,
    ...overrides,
  }

  const params = new URLSearchParams()
  for (const key of ORDERED_KEYS) {
    const value = cleanString(merged[key])
    if (value) params.set(key, value)
  }

  const qs = params.toString()
  return qs ? `/stays?${qs}` : '/stays'
}

export function stayBookingContextParams(current: StaySearchParams): URLSearchParams {
  const params = new URLSearchParams()
  if (current.checkin) params.set('checkin', current.checkin)
  if (current.checkout) params.set('checkout', current.checkout)
  if (current.adults) params.set('adults', String(current.adults))
  if (current.children != null && current.children > 0) params.set('children', String(current.children))
  if (current.rooms) params.set('rooms', String(current.rooms))
  return params
}

export function stayDetailUrl(hotelId: string, current: StaySearchParams): string {
  const params = stayBookingContextParams(current)
  const qs = params.toString()
  return qs ? `/stays/${encodeURIComponent(hotelId)}?${qs}` : `/stays/${encodeURIComponent(hotelId)}`
}

export function stayDateRangeLabel(params: Pick<StaySearchParams, 'checkin' | 'checkout'>): string {
  if (params.checkin && params.checkout) {
    return `${dateLabel(params.checkin)} - ${dateLabel(params.checkout)}`
  }
  if (params.checkin) return `From ${dateLabel(params.checkin)}`
  if (params.checkout) return `Until ${dateLabel(params.checkout)}`
  return ''
}

export function stayTravelerLabel(params: Pick<StaySearchParams, 'adults' | 'children'>): string {
  const adults = params.adults ?? 0
  const children = params.children ?? 0
  const total = adults + children
  if (total <= 0) return ''
  return `${total} ${total === 1 ? 'traveler' : 'travelers'}`
}

export function stayAmenitiesLabel(params: Pick<StaySearchParams, 'amenities'>): string {
  if (params.amenities.length === 0) return ''
  if (params.amenities.length === 1) return params.amenities[0]
  return `${params.amenities[0]} +${params.amenities.length - 1}`
}

export function stayAmenityUrlValue(amenities: string[]): string | undefined {
  return amenities.length > 0 ? amenities.join(',') : undefined
}

export function stayTravelerDetail(params: Pick<StaySearchParams, 'adults' | 'children'>): string {
  const parts: string[] = []
  if (params.adults) parts.push(`${params.adults} ${params.adults === 1 ? 'adult' : 'adults'}`)
  if (params.children) parts.push(`${params.children} ${params.children === 1 ? 'child' : 'children'}`)
  return parts.join(', ')
}

export function stayTotalTravelers(params: Pick<StaySearchParams, 'adults' | 'children'>): number {
  return (params.adults ?? 0) + (params.children ?? 0)
}

export function stayRoomsLabel(params: Pick<StaySearchParams, 'rooms'>): string {
  if (!params.rooms) return ''
  return `${params.rooms} ${params.rooms === 1 ? 'room' : 'rooms'}`
}
