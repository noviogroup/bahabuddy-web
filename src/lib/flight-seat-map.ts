export type FlightSeat = {
  serviceId: string
  segmentKey: string
  name: string
  row: number
  column: string
  seatNumber: string
  seatType: string
  position: string
  available: boolean
  price: number
  currency: string
}

export type FlightSeatMap = {
  segmentKey: string
  segmentLabel: string
  seats: FlightSeat[]
}

export type FlightAncillaryCategory = 'baggage' | 'meal' | 'lounge'

export type FlightAncillary = {
  serviceId: string
  category: FlightAncillaryCategory
  name: string
  description: string
  segmentKey: string
  segmentLabel: string
  available: boolean
  price: number
  currency: string
}

export type SelectedFlightService = {
  passengerIndex: number
  serviceId: string
  quantity: number
}

type JsonRecord = Record<string, unknown>

export function normalizeFlightSeatMaps(value: unknown): FlightSeatMap[] {
  if (Array.isArray(value)) return normalizeSeatMaps(value)
  const source = asRecord(value)
  const booking = asRecord(source.booking)
  const groups = records(asRecord(source.servicesAttachable ?? booking.servicesAttachable).groups)
  const maps = new Map<string, FlightSeatMap>()

  groups.forEach((group, groupIndex) => {
    const groupSegmentKey = firstString(group.segmentKey, group.segment_key)
    const groupLabel = firstString(group.name, group.label, group.segmentName, group.segment_name)
    records(group.services).forEach((service) => {
      if (firstString(service.category).toLowerCase() !== 'seat') return
      const serviceId = firstString(service.serviceId, service.service_id)
      if (!serviceId) return
      const seatMeta = asRecord(asRecord(service.metadata).seat)
      const name = firstString(service.name, 'Seat')
      const parsed = parseSeatNumber(firstString(seatMeta.seatNumber, seatMeta.seat_number, name))
      const row = numberValue(seatMeta.seatRow ?? seatMeta.seat_row ?? parsed?.row)
      const column = firstString(seatMeta.seatColumn, seatMeta.seat_column, parsed?.column).toUpperCase()
      if (!row || !column) return
      const segmentKey = firstString(service.segmentKey, service.segment_key, groupSegmentKey, `segment-${groupIndex + 1}`)
      const display = asRecord(asRecord(service.pricing).display)
      const seatMap = maps.get(segmentKey) ?? {
        segmentKey,
        segmentLabel: groupLabel || `Flight ${maps.size + 1}`,
        seats: [],
      }
      seatMap.seats.push({
        serviceId,
        segmentKey,
        name,
        row,
        column,
        seatNumber: firstString(seatMeta.seatNumber, seatMeta.seat_number, `${row}${column}`),
        seatType: firstString(seatMeta.seatType, seatMeta.seat_type, 'standard'),
        position: firstString(seatMeta.position),
        available: seatMeta.available !== false,
        price: numberValue(display.amount ?? display.total),
        currency: firstString(display.currency, 'USD').toUpperCase(),
      })
      maps.set(segmentKey, seatMap)
    })
  })

  return Array.from(maps.values()).map((seatMap) => ({
    ...seatMap,
    seats: seatMap.seats.sort((a, b) => a.row === b.row ? a.column.localeCompare(b.column) : a.row - b.row),
  }))
}

export function normalizeSelectedSeatServices(
  value: unknown,
): SelectedFlightService[] {
  return normalizeSelectedFlightServices(value).map((service) => ({
    ...service,
    quantity: 1,
  }))
}

export function normalizeFlightAncillaries(value: unknown): FlightAncillary[] {
  if (Array.isArray(value)) return normalizeAncillaries(value)
  const source = asRecord(value)
  const booking = asRecord(source.booking)
  const groups = records(asRecord(source.servicesAttachable ?? booking.servicesAttachable).groups)
  const ancillaries: FlightAncillary[] = []

  groups.forEach((group, groupIndex) => {
    const groupSegmentKey = firstString(group.segmentKey, group.segment_key)
    const groupLabel = firstString(group.name, group.label, group.segmentName, group.segment_name)
    records(group.services).forEach((service) => {
      const metadata = asRecord(service.metadata)
      const category = ancillaryCategory(
        service.category,
        service.type,
        metadata.category,
        metadata.type,
        group.category,
        group.type,
        service.name,
      )
      const serviceId = firstString(service.serviceId, service.service_id)
      if (!category || !serviceId) return
      const pricing = asRecord(service.pricing)
      const display = asRecord(pricing.display)
      ancillaries.push({
        serviceId,
        category,
        name: firstString(service.name, service.label, ancillaryLabel(category)),
        description: firstString(service.description, service.details, metadata.description, metadata.details),
        segmentKey: firstString(service.segmentKey, service.segment_key, groupSegmentKey, `segment-${groupIndex + 1}`),
        segmentLabel: groupLabel || `Flight ${groupIndex + 1}`,
        available: service.available !== false && metadata.available !== false,
        price: numberValue(display.amount ?? display.total ?? pricing.amount ?? pricing.total),
        currency: firstString(display.currency, pricing.currency, 'USD').toUpperCase(),
      })
    })
  })

  return ancillaries
    .filter((item) => item.available)
    .sort((a, b) => a.segmentLabel.localeCompare(b.segmentLabel) || a.category.localeCompare(b.category) || a.price - b.price)
}

export function normalizeSelectedFlightServices(value: unknown): SelectedFlightService[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const service = asRecord(item)
    const passengerIndexValue = service.passengerIndex ?? service.passenger_index
    const passengerIndex = typeof passengerIndexValue === 'number'
      ? passengerIndexValue
      : Number(passengerIndexValue)
    const serviceId = firstString(service.serviceId, service.service_id)
    const quantityValue = service.quantity ?? 1
    const quantity = typeof quantityValue === 'number' ? quantityValue : Number(quantityValue)
    if (!Number.isFinite(passengerIndex) || !Number.isInteger(passengerIndex) || passengerIndex < 0 || !serviceId || !Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Each selected service requires a non-negative passengerIndex, serviceId, and positive integer quantity.')
    }
    return { passengerIndex, serviceId, quantity }
  })
}

export function selectedSeatServices(
  selections: Record<string, Record<number, FlightSeat>>,
): SelectedFlightService[] {
  return Object.values(selections).flatMap((segment) => (
    Object.entries(segment).map(([passengerIndex, seat]) => ({
      passengerIndex: Number(passengerIndex),
      serviceId: seat.serviceId,
      quantity: 1,
    }))
  ))
}

export function selectedAncillaryServices(
  selections: Record<string, Record<number, FlightAncillary>>,
): SelectedFlightService[] {
  return Object.values(selections).flatMap((category) => (
    Object.entries(category).map(([passengerIndex, option]) => ({
      passengerIndex: Number(passengerIndex),
      serviceId: option.serviceId,
      quantity: 1,
    }))
  ))
}

function normalizeSeatMaps(value: unknown[]): FlightSeatMap[] {
  return value.map((item) => {
    const map = asRecord(item)
    return {
      segmentKey: firstString(map.segment_key, map.segmentKey),
      segmentLabel: firstString(map.segment_label, map.segmentLabel, 'Flight'),
      seats: records(map.seats).map((seat) => ({
        serviceId: firstString(seat.service_id, seat.serviceId),
        segmentKey: firstString(seat.segment_key, seat.segmentKey),
        name: firstString(seat.name, 'Seat'),
        row: numberValue(seat.row),
        column: firstString(seat.column).toUpperCase(),
        seatNumber: firstString(seat.seat_number, seat.seatNumber),
        seatType: firstString(seat.seat_type, seat.seatType, 'standard'),
        position: firstString(seat.position),
        available: seat.available !== false,
        price: numberValue(seat.price),
        currency: firstString(seat.currency, 'USD').toUpperCase(),
      })).filter((seat) => Boolean(seat.serviceId && seat.row && seat.column)),
    }
  }).filter((map) => map.seats.length > 0)
}

function normalizeAncillaries(value: unknown[]): FlightAncillary[] {
  return value.map((item) => {
    const option = asRecord(item)
    const category = ancillaryCategory(option.category)
    return category ? {
      serviceId: firstString(option.service_id, option.serviceId),
      category,
      name: firstString(option.name, ancillaryLabel(category)),
      description: firstString(option.description),
      segmentKey: firstString(option.segment_key, option.segmentKey),
      segmentLabel: firstString(option.segment_label, option.segmentLabel, 'Flight'),
      available: option.available !== false,
      price: numberValue(option.price),
      currency: firstString(option.currency, 'USD').toUpperCase(),
    } : null
  }).filter((item): item is FlightAncillary => Boolean(item?.serviceId && item.available))
}

function ancillaryCategory(...values: unknown[]): FlightAncillaryCategory | null {
  const candidate = values
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
  if (/\b(baggage|bag|luggage)\b/.test(candidate)) return 'baggage'
  if (/\b(meal|food|catering)\b/.test(candidate)) return 'meal'
  if (/\b(lounge|priority pass)\b/.test(candidate)) return 'lounge'
  return null
}

function ancillaryLabel(category: FlightAncillaryCategory): string {
  if (category === 'baggage') return 'Extra baggage'
  if (category === 'meal') return 'Meal'
  return 'Lounge access'
}

function parseSeatNumber(value: string): { row: number; column: string } | null {
  const match = /\b(\d+)([A-Za-z]+)\b/.exec(value)
  return match ? { row: Number(match[1]), column: match[2].toUpperCase() } : null
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function numberValue(value: unknown): number {
  const result = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(result) ? result : 0
}
