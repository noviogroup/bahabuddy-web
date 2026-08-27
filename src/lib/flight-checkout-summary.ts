export interface FlightCheckoutLeg {
  direction?: string
  route?: string
  flightNumber?: string
  departure?: string
  arrival?: string
  duration?: string
  stops?: string
  aircraft?: string
}

export interface FlightBaggageAllowance {
  type?: 'carry_on' | 'checked'
  pieces?: number
  weightKg?: number
  dimensions?: string
  description?: string
  passengerType?: string
}

export interface FlightBaggageSummary {
  carry_on?: boolean
  checked?: number
  allowances?: FlightBaggageAllowance[]
}

export interface FlightCheckoutSummary {
  route?: string
  airline?: string
  airlineCode?: string
  flightNumber?: string
  airlineLogoUrl?: string
  departure?: string
  arrival?: string
  duration?: string
  stops?: string
  aircraft?: string
  price?: number
  baseFare?: number
  taxes?: number
  fees?: number
  currency?: string
  passengers?: number
  cabinClass?: string
  fareBrand?: string
  refundable?: boolean
  changeable?: boolean
  expiration?: string
  carryOn?: boolean
  checkedBags?: number
  baggageAllowances?: FlightBaggageAllowance[]
  tripType?: string
  legs?: FlightCheckoutLeg[]
}

type SearchParams = Record<string, string | string[] | undefined>

type FlightCardLike = FlightCheckoutSummary & {
  airline_code?: string
  flight_number?: string
  flight_numbers?: string[]
  airline_logo_url?: string
  base_fare?: number
  cabin_class?: string
  fare_brand?: string
  trip_type?: string
  flight_legs?: FlightCheckoutLeg[]
  aircraft_types?: string[]
  baggage?: FlightBaggageSummary
}

const QUERY_KEYS = {
  route: 'route',
  airline: 'airline',
  airlineCode: 'airlineCode',
  flightNumber: 'flightNumber',
  airlineLogoUrl: 'airlineLogoUrl',
  departure: 'departure',
  arrival: 'arrival',
  duration: 'duration',
  stops: 'stops',
  aircraft: 'aircraft',
  price: 'price',
  baseFare: 'baseFare',
  taxes: 'taxes',
  fees: 'fees',
  currency: 'currency',
  passengers: 'passengers',
  cabinClass: 'cabin',
  fareBrand: 'fare',
  refundable: 'refundable',
  changeable: 'changeable',
  expiration: 'expiration',
  carryOn: 'carryOn',
  checkedBags: 'checkedBags',
  baggageAllowances: 'baggageAllowances',
  tripType: 'tripType',
  legs: 'legs',
} as const

export function flightCheckoutSummaryFromCard(card: FlightCardLike): FlightCheckoutSummary {
  return compactSummary({
    route: card.route,
    airline: card.airline,
    airlineCode: card.airlineCode ?? card.airline_code,
    flightNumber: flightNumberValue(card.flightNumber ?? card.flight_number ?? card.flight_numbers),
    airlineLogoUrl: card.airlineLogoUrl ?? card.airline_logo_url,
    departure: card.departure,
    arrival: card.arrival,
    duration: card.duration,
    stops: card.stops,
    aircraft: aircraftLabelValue(card.aircraft ?? card.aircraft_types),
    price: card.price,
    baseFare: card.baseFare ?? card.base_fare,
    taxes: card.taxes,
    fees: card.fees,
    currency: card.currency,
    passengers: card.passengers,
    cabinClass: card.cabinClass ?? card.cabin_class,
    fareBrand: card.fareBrand ?? card.fare_brand,
    refundable: card.refundable,
    changeable: card.changeable,
    expiration: card.expiration,
    carryOn: card.carryOn ?? card.baggage?.carry_on,
    checkedBags: card.checkedBags ?? card.baggage?.checked,
    baggageAllowances: normalizeBaggageAllowances(card.baggageAllowances ?? card.baggage?.allowances),
    tripType: card.tripType ?? card.trip_type,
    legs: normalizeLegs(card.legs ?? card.flight_legs),
  })
}

export function appendFlightCheckoutSummary(pathname: string, summary: FlightCheckoutSummary): string {
  const params = new URLSearchParams()

  appendString(params, QUERY_KEYS.route, summary.route)
  appendString(params, QUERY_KEYS.airline, summary.airline)
  appendString(params, QUERY_KEYS.airlineCode, summary.airlineCode)
  appendString(params, QUERY_KEYS.flightNumber, summary.flightNumber)
  appendString(params, QUERY_KEYS.airlineLogoUrl, summary.airlineLogoUrl)
  appendString(params, QUERY_KEYS.departure, summary.departure)
  appendString(params, QUERY_KEYS.arrival, summary.arrival)
  appendString(params, QUERY_KEYS.duration, summary.duration)
  appendString(params, QUERY_KEYS.stops, summary.stops)
  appendString(params, QUERY_KEYS.aircraft, summary.aircraft)
  appendNumber(params, QUERY_KEYS.price, summary.price)
  appendNonNegativeNumber(params, QUERY_KEYS.baseFare, summary.baseFare)
  appendNonNegativeNumber(params, QUERY_KEYS.taxes, summary.taxes)
  appendNonNegativeNumber(params, QUERY_KEYS.fees, summary.fees)
  appendString(params, QUERY_KEYS.currency, summary.currency)
  appendNumber(params, QUERY_KEYS.passengers, summary.passengers)
  appendString(params, QUERY_KEYS.cabinClass, summary.cabinClass)
  appendString(params, QUERY_KEYS.fareBrand, summary.fareBrand)
  appendBoolean(params, QUERY_KEYS.refundable, summary.refundable)
  appendBoolean(params, QUERY_KEYS.changeable, summary.changeable)
  appendString(params, QUERY_KEYS.expiration, summary.expiration)
  appendBoolean(params, QUERY_KEYS.carryOn, summary.carryOn)
  appendNumber(params, QUERY_KEYS.checkedBags, summary.checkedBags)
  appendBaggageAllowances(params, QUERY_KEYS.baggageAllowances, summary.baggageAllowances)
  appendString(params, QUERY_KEYS.tripType, summary.tripType)
  appendLegs(params, QUERY_KEYS.legs, summary.legs)

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function flightCheckoutSummaryFromSearchParams(searchParams: SearchParams): FlightCheckoutSummary | undefined {
  const summary = compactSummary({
    route: stringParam(searchParams, QUERY_KEYS.route),
    airline: stringParam(searchParams, QUERY_KEYS.airline),
    airlineCode: stringParam(searchParams, QUERY_KEYS.airlineCode),
    flightNumber: stringParam(searchParams, QUERY_KEYS.flightNumber),
    airlineLogoUrl: stringParam(searchParams, QUERY_KEYS.airlineLogoUrl),
    departure: stringParam(searchParams, QUERY_KEYS.departure),
    arrival: stringParam(searchParams, QUERY_KEYS.arrival),
    duration: stringParam(searchParams, QUERY_KEYS.duration),
    stops: stringParam(searchParams, QUERY_KEYS.stops),
    aircraft: stringParam(searchParams, QUERY_KEYS.aircraft),
    price: numberParam(searchParams, QUERY_KEYS.price),
    baseFare: nonNegativeNumberParam(searchParams, QUERY_KEYS.baseFare),
    taxes: nonNegativeNumberParam(searchParams, QUERY_KEYS.taxes),
    fees: nonNegativeNumberParam(searchParams, QUERY_KEYS.fees),
    currency: stringParam(searchParams, QUERY_KEYS.currency),
    passengers: numberParam(searchParams, QUERY_KEYS.passengers),
    cabinClass: stringParam(searchParams, QUERY_KEYS.cabinClass),
    fareBrand: stringParam(searchParams, QUERY_KEYS.fareBrand),
    refundable: booleanParam(searchParams, QUERY_KEYS.refundable),
    changeable: booleanParam(searchParams, QUERY_KEYS.changeable),
    expiration: stringParam(searchParams, QUERY_KEYS.expiration),
    carryOn: booleanParam(searchParams, QUERY_KEYS.carryOn),
    checkedBags: numberParam(searchParams, QUERY_KEYS.checkedBags),
    baggageAllowances: baggageAllowancesParam(searchParams, QUERY_KEYS.baggageAllowances),
    tripType: stringParam(searchParams, QUERY_KEYS.tripType),
    legs: legsParam(searchParams, QUERY_KEYS.legs),
  })

  return Object.keys(summary).length > 0 ? summary : undefined
}

export function routeCodesFromSummary(summary?: FlightCheckoutSummary): { origin?: string; destination?: string } {
  const route = summary?.route
  if (!route) return {}
  const parts = route
    .split(/\s+to\s+|[→>-]/i)
    .map((part) => part.trim())
    .filter(Boolean)

  return {
    origin: parts[0]?.toUpperCase(),
    destination: parts[1]?.toUpperCase(),
  }
}

function compactSummary(summary: FlightCheckoutSummary): FlightCheckoutSummary {
  const compact: FlightCheckoutSummary = {}
  for (const [key, value] of Object.entries(summary) as Array<[keyof FlightCheckoutSummary, FlightCheckoutSummary[keyof FlightCheckoutSummary]]>) {
    if (typeof value === 'string') {
      const cleaned = value.trim()
      if (cleaned) compact[key] = cleaned as never
    } else if (typeof value === 'number') {
      const isProviderLineItem = key === 'baseFare' || key === 'taxes' || key === 'fees'
      if (Number.isFinite(value) && (value > 0 || (isProviderLineItem && value === 0))) {
        compact[key] = value as never
      }
    } else if (typeof value === 'boolean') {
      compact[key] = value as never
    } else if (Array.isArray(value)) {
      if (key === 'baggageAllowances') {
        const allowances = normalizeBaggageAllowances(value)
        if (allowances?.length) compact[key] = allowances as never
      } else {
        const legs = normalizeLegs(value)
        if (legs?.length) compact[key] = legs as never
      }
    }
  }
  return compact
}

function normalizeLegs(value: unknown): FlightCheckoutLeg[] | undefined {
  if (!Array.isArray(value)) return undefined
  const legs = value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const record = item as Record<string, unknown>
      return compactLeg({
        direction: stringValue(record.direction),
        route: stringValue(record.route),
        flightNumber: flightNumberValue(record.flightNumber ?? record.flight_number ?? record.flight_numbers),
        departure: stringValue(record.departure),
        arrival: stringValue(record.arrival),
        duration: stringValue(record.duration),
        stops: stringValue(record.stops),
        aircraft: aircraftLabelValue(record.aircraft ?? record.aircraft_types),
      })
    })
    .filter((item): item is FlightCheckoutLeg => Boolean(item))

  return legs.length > 0 ? legs : undefined
}

function aircraftLabelValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (!Array.isArray(value)) return undefined
  const types = value
    .map((item) => String(item).trim())
    .filter(Boolean)
  return Array.from(new Set(types)).join(' · ') || undefined
}

function compactLeg(leg: FlightCheckoutLeg): FlightCheckoutLeg | null {
  const compact: FlightCheckoutLeg = {}
  for (const [key, value] of Object.entries(leg) as Array<[keyof FlightCheckoutLeg, string | undefined]>) {
    if (value?.trim()) compact[key] = value.trim()
  }
  return Object.keys(compact).length > 0 ? compact : null
}

function appendString(params: URLSearchParams, key: string, value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return
  params.set(key, value.trim())
}

function appendNumber(params: URLSearchParams, key: string, value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return
  params.set(key, String(value))
}

function appendNonNegativeNumber(params: URLSearchParams, key: string, value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return
  params.set(key, String(value))
}

function appendBoolean(params: URLSearchParams, key: string, value: unknown) {
  if (typeof value !== 'boolean') return
  params.set(key, value ? '1' : '0')
}

function appendLegs(params: URLSearchParams, key: string, value: unknown) {
  const legs = normalizeLegs(value)
  if (!legs?.length) return
  params.set(key, JSON.stringify(legs))
}

function appendBaggageAllowances(params: URLSearchParams, key: string, value: unknown) {
  const allowances = normalizeBaggageAllowances(value)
  if (!allowances?.length) return
  params.set(key, JSON.stringify(allowances))
}

function stringParam(params: SearchParams, key: string): string | undefined {
  const value = Array.isArray(params[key]) ? params[key]?.[0] : params[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function flightNumberValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const numbers = value
      .map((item) => stringValue(item))
      .filter((item): item is string => Boolean(item))
    return numbers.length > 0 ? numbers.join(' · ') : undefined
  }
  return stringValue(value)
}

function numberParam(params: SearchParams, key: string): number | undefined {
  const value = stringParam(params, key)
  if (!value) return undefined
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function nonNegativeNumberParam(params: SearchParams, key: string): number | undefined {
  const value = stringParam(params, key)
  if (!value) return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

function booleanParam(params: SearchParams, key: string): boolean | undefined {
  const value = stringParam(params, key)
  if (!value) return undefined
  if (value === '1' || value.toLowerCase() === 'true') return true
  if (value === '0' || value.toLowerCase() === 'false') return false
  return undefined
}

function legsParam(params: SearchParams, key: string): FlightCheckoutLeg[] | undefined {
  const value = stringParam(params, key)
  if (!value) return undefined
  try {
    return normalizeLegs(JSON.parse(value))
  } catch {
    return undefined
  }
}

function baggageAllowancesParam(params: SearchParams, key: string): FlightBaggageAllowance[] | undefined {
  const value = stringParam(params, key)
  if (!value) return undefined
  try {
    return normalizeBaggageAllowances(JSON.parse(value))
  } catch {
    return undefined
  }
}

function normalizeBaggageAllowances(value: unknown): FlightBaggageAllowance[] | undefined {
  if (!Array.isArray(value)) return undefined
  const allowances = value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    const typeValue = stringValue(record.type)
    const type = typeValue === 'carry_on' || typeValue === 'checked' ? typeValue : undefined
    const allowance: FlightBaggageAllowance = {
      type,
      pieces: positiveNumber(record.pieces),
      weightKg: positiveNumber(record.weightKg ?? record.weight_kg),
      dimensions: stringValue(record.dimensions),
      description: stringValue(record.description),
      passengerType: stringValue(record.passengerType ?? record.passenger_type),
    }
    return Object.values(allowance).some((entry) => entry !== undefined) ? [allowance] : []
  })
  return allowances.length > 0 ? allowances : undefined
}

function positiveNumber(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}
