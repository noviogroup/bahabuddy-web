export type BookingListItem = {
  id: string
  tripId: string
  tripName: string
  type: 'flight' | 'hotel'
  title: string
  subtitle: string | null
  dates: string | null
  price: number | null
  currency?: string | null
  priceQualifier?: 'total' | 'per night' | null
  bookingReference: string | null
  status?: string | null
  paymentStatus?: string | null
  providerStatus?: string | null
  provider?: string | null
  sourceSurface?: string | null
}

export type TripSummaryRow = {
  id: string
  name: string
}

export type CanonicalBookingRow = {
  id: string
  trip_id: string | null
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
  reference_id?: string | null
  financial_metadata?: Record<string, unknown> | null
  created_at?: string | null
}

export type FlightBookingRow = {
  id: string
  trip_id: string
  origin: string | null
  destination: string | null
  airline: string | null
  departure_at: string | null
  arrival_at: string | null
  price: number | null
  booking_reference: string | null
  stripe_payment_intent_id?: string | null
}

export type AccommodationBookingRow = {
  id: string
  trip_id: string
  name: string
  island: string | null
  check_in: string | null
  check_out: string | null
  price_per_night: number | null
  total_price?: number | null
  currency?: string | null
  status?: string | null
  booking_reference: string | null
  stripe_payment_intent_id?: string | null
}

export function createBookingListItems({
  bookings,
  trips,
  flights,
  accommodations,
}: {
  bookings: CanonicalBookingRow[]
  trips: TripSummaryRow[]
  flights: FlightBookingRow[]
  accommodations: AccommodationBookingRow[]
}): BookingListItem[] {
  const tripNameById = new Map(trips.map(trip => [trip.id, trip.name]))

  return bookings
    .filter(booking => Boolean(booking.trip_id))
    .map(booking => {
      const kind = bookingKind(booking)
      return kind === 'flight'
        ? flightBookingItem(booking, tripNameById, flights)
        : stayBookingItem(booking, tripNameById, accommodations)
    })
    .sort((a, b) => sortValue(b) - sortValue(a))
}

function flightBookingItem(
  booking: CanonicalBookingRow,
  tripNameById: Map<string, string>,
  flights: FlightBookingRow[],
): BookingListItem {
  const match = findMatchingFlight(booking, flights)
  const metadata = booking.financial_metadata ?? {}
  const origin = match?.origin ?? stringValue(metadata.origin) ?? 'Flight'
  const destination = match?.destination ?? stringValue(metadata.destination) ?? 'Bahamas'
  const airline = match?.airline ?? stringValue(metadata.airline) ?? providerLabel(booking.provider)

  return {
    id: booking.id,
    tripId: booking.trip_id as string,
    tripName: tripNameById.get(booking.trip_id as string) ?? 'Unknown Trip',
    type: 'flight',
    title: `${origin} -> ${destination}`,
    subtitle: airline,
    dates: flightDates(match),
    price: booking.amount ?? match?.price ?? null,
    currency: booking.currency ?? 'USD',
    priceQualifier: 'total',
    bookingReference: providerReference(booking) ?? match?.booking_reference ?? null,
    status: bookingStatus(booking),
    paymentStatus: paymentStatus(booking),
    providerStatus: providerStatus(booking, match?.booking_reference ?? null),
    provider: booking.provider ?? 'liteapi',
    sourceSurface: sourceSurface(booking),
  }
}

function stayBookingItem(
  booking: CanonicalBookingRow,
  tripNameById: Map<string, string>,
  accommodations: AccommodationBookingRow[],
): BookingListItem {
  const match = findMatchingStay(booking, accommodations)
  const metadata = booking.financial_metadata ?? {}
  const hotelName = match?.name ?? stringValue(metadata.hotel_name) ?? 'Stay booking'
  const island = match?.island ?? stringValue(metadata.island)
  const checkin = match?.check_in ?? stringValue(metadata.checkin)
  const checkout = match?.check_out ?? stringValue(metadata.checkout)
  const matchPrice = match?.total_price ?? match?.price_per_night ?? null

  return {
    id: booking.id,
    tripId: booking.trip_id as string,
    tripName: tripNameById.get(booking.trip_id as string) ?? 'Unknown Trip',
    type: 'hotel',
    title: hotelName,
    subtitle: island ?? null,
    dates: stayDates(checkin ?? null, checkout ?? null),
    price: booking.amount ?? matchPrice,
    currency: booking.currency ?? match?.currency ?? 'USD',
    priceQualifier: booking.amount || match?.total_price ? 'total' : 'per night',
    bookingReference: providerReference(booking) ?? match?.booking_reference ?? null,
    status: bookingStatus(booking),
    paymentStatus: paymentStatus(booking),
    providerStatus: providerStatus(booking, match?.booking_reference ?? null, match?.status),
    provider: booking.provider ?? 'liteapi',
    sourceSurface: sourceSurface(booking),
  }
}

function findMatchingFlight(booking: CanonicalBookingRow, flights: FlightBookingRow[]): FlightBookingRow | null {
  const candidates = flights.filter(row => row.trip_id === booking.trip_id)
  return findMatchingTripItem(booking, candidates)
}

function findMatchingStay(booking: CanonicalBookingRow, stays: AccommodationBookingRow[]): AccommodationBookingRow | null {
  const candidates = stays.filter(row => row.trip_id === booking.trip_id)
  return findMatchingTripItem(booking, candidates)
}

function findMatchingTripItem<T extends { id: string; stripe_payment_intent_id?: string | null; booking_reference?: string | null }>(
  booking: CanonicalBookingRow,
  candidates: T[],
): T | null {
  if (booking.reference_id) {
    const byId = candidates.find(row => row.id === booking.reference_id)
    if (byId) return byId
  }

  if (booking.stripe_payment_intent_id) {
    const byPayment = candidates.find(row => row.stripe_payment_intent_id === booking.stripe_payment_intent_id)
    if (byPayment) return byPayment
  }

  const refs = bookingReferences(booking)
  if (refs.length > 0) {
    const byReference = candidates.find(row => row.booking_reference && refs.includes(row.booking_reference))
    if (byReference) return byReference
  }

  return candidates.length === 1 ? candidates[0] : null
}

function bookingKind(booking: CanonicalBookingRow): 'flight' | 'hotel' {
  const raw = `${booking.booking_type ?? ''}:${booking.type ?? ''}`.toLowerCase()
  return raw.includes('flight') ? 'flight' : 'hotel'
}

function bookingStatus(booking: CanonicalBookingRow): string {
  const status = (booking.status ?? '').toLowerCase()
  if (['confirmed', 'paid', 'booked', 'ticketed', 'success', 'succeeded'].includes(status)) return 'confirmed'
  if (['failed', 'error'].includes(status)) return 'failed'
  if (['cancelled', 'canceled'].includes(status)) return 'cancelled'
  if (status === 'refunded') return 'refunded'
  return status || 'pending'
}

function paymentStatus(booking: CanonicalBookingRow): string {
  const status = (booking.status ?? '').toLowerCase()
  if (['failed', 'cancelled', 'canceled', 'refunded'].includes(status)) return status === 'canceled' ? 'cancelled' : status
  if (booking.paid_at || booking.stripe_payment_intent_id || ['confirmed', 'paid', 'booked', 'ticketed'].includes(status)) return 'paid'
  return status === 'pending' ? 'pending' : 'unpaid'
}

function providerStatus(
  booking: CanonicalBookingRow,
  itemReference: string | null,
  itemStatus?: string | null,
): string {
  const metadata = booking.financial_metadata ?? {}
  const metadataStatus = stringValue(metadata.provider_status)
  const status = (metadataStatus ?? itemStatus ?? booking.status ?? '').toLowerCase()
  if (['confirmed', 'booked', 'ticketed', 'success', 'succeeded'].includes(status)) return 'confirmed'
  if (['failed', 'error'].includes(status)) return 'failed'
  if (['cancelled', 'canceled', 'refunded'].includes(status)) return status === 'refunded' ? 'cancelled' : 'cancelled'
  if (providerReference(booking) || itemReference) return 'confirmed'
  return status || 'pending'
}

function providerReference(booking: CanonicalBookingRow): string | null {
  return booking.external_reference
    ?? booking.booking_reference
    ?? booking.booking_ref
    ?? null
}

function bookingReferences(booking: CanonicalBookingRow): string[] {
  return [booking.external_reference, booking.booking_reference, booking.booking_ref].filter(Boolean) as string[]
}

function sourceSurface(booking: CanonicalBookingRow): string {
  const metadata = booking.financial_metadata ?? {}
  return stringValue(metadata.source_surface)
    ?? stringValue(metadata.source)
    ?? stringValue(metadata.surface)
    ?? 'web'
}

function providerLabel(provider: string | null | undefined): string | null {
  if (!provider) return null
  if (provider.toLowerCase().includes('liteapi')) return 'LiteAPI'
  return provider
}

function flightDates(match: FlightBookingRow | null): string | null {
  const dep = formatDate(match?.departure_at ?? null)
  const arr = formatDate(match?.arrival_at ?? null)
  if (!dep) return null
  return arr && arr !== dep ? `${dep} -> ${arr}` : dep
}

function stayDates(checkin: string | null, checkout: string | null): string | null {
  const start = formatDate(checkin)
  const end = formatDate(checkout)
  if (!start) return null
  return end ? `${start} -> ${end}` : start
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function sortValue(item: BookingListItem): number {
  const date = item.dates?.split(' -> ')[0]
  if (!date) return 0
  const parsed = new Date(date).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}
