export interface FlightCheckoutSummary {
  route?: string
  airline?: string
  airlineCode?: string
  departure?: string
  arrival?: string
  duration?: string
  stops?: string
  price?: number
  currency?: string
  passengers?: number
  cabinClass?: string
  fareBrand?: string
  refundable?: boolean
  expiration?: string
  carryOn?: boolean
  checkedBags?: number
}

type SearchParams = Record<string, string | string[] | undefined>

type FlightCardLike = FlightCheckoutSummary & {
  airline_code?: string
  cabin_class?: string
  fare_brand?: string
  baggage?: {
    carry_on?: boolean
    checked?: number
  }
}

const QUERY_KEYS = {
  route: 'route',
  airline: 'airline',
  airlineCode: 'airlineCode',
  departure: 'departure',
  arrival: 'arrival',
  duration: 'duration',
  stops: 'stops',
  price: 'price',
  currency: 'currency',
  passengers: 'passengers',
  cabinClass: 'cabin',
  fareBrand: 'fare',
  refundable: 'refundable',
  expiration: 'expiration',
  carryOn: 'carryOn',
  checkedBags: 'checkedBags',
} as const

export function flightCheckoutSummaryFromCard(card: FlightCardLike): FlightCheckoutSummary {
  return compactSummary({
    route: card.route,
    airline: card.airline,
    airlineCode: card.airlineCode ?? card.airline_code,
    departure: card.departure,
    arrival: card.arrival,
    duration: card.duration,
    stops: card.stops,
    price: card.price,
    currency: card.currency,
    passengers: card.passengers,
    cabinClass: card.cabinClass ?? card.cabin_class,
    fareBrand: card.fareBrand ?? card.fare_brand,
    refundable: card.refundable,
    expiration: card.expiration,
    carryOn: card.carryOn ?? card.baggage?.carry_on,
    checkedBags: card.checkedBags ?? card.baggage?.checked,
  })
}

export function appendFlightCheckoutSummary(pathname: string, summary: FlightCheckoutSummary): string {
  const params = new URLSearchParams()

  appendString(params, QUERY_KEYS.route, summary.route)
  appendString(params, QUERY_KEYS.airline, summary.airline)
  appendString(params, QUERY_KEYS.airlineCode, summary.airlineCode)
  appendString(params, QUERY_KEYS.departure, summary.departure)
  appendString(params, QUERY_KEYS.arrival, summary.arrival)
  appendString(params, QUERY_KEYS.duration, summary.duration)
  appendString(params, QUERY_KEYS.stops, summary.stops)
  appendNumber(params, QUERY_KEYS.price, summary.price)
  appendString(params, QUERY_KEYS.currency, summary.currency)
  appendNumber(params, QUERY_KEYS.passengers, summary.passengers)
  appendString(params, QUERY_KEYS.cabinClass, summary.cabinClass)
  appendString(params, QUERY_KEYS.fareBrand, summary.fareBrand)
  appendBoolean(params, QUERY_KEYS.refundable, summary.refundable)
  appendString(params, QUERY_KEYS.expiration, summary.expiration)
  appendBoolean(params, QUERY_KEYS.carryOn, summary.carryOn)
  appendNumber(params, QUERY_KEYS.checkedBags, summary.checkedBags)

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function flightCheckoutSummaryFromSearchParams(searchParams: SearchParams): FlightCheckoutSummary | undefined {
  const summary = compactSummary({
    route: stringParam(searchParams, QUERY_KEYS.route),
    airline: stringParam(searchParams, QUERY_KEYS.airline),
    airlineCode: stringParam(searchParams, QUERY_KEYS.airlineCode),
    departure: stringParam(searchParams, QUERY_KEYS.departure),
    arrival: stringParam(searchParams, QUERY_KEYS.arrival),
    duration: stringParam(searchParams, QUERY_KEYS.duration),
    stops: stringParam(searchParams, QUERY_KEYS.stops),
    price: numberParam(searchParams, QUERY_KEYS.price),
    currency: stringParam(searchParams, QUERY_KEYS.currency),
    passengers: numberParam(searchParams, QUERY_KEYS.passengers),
    cabinClass: stringParam(searchParams, QUERY_KEYS.cabinClass),
    fareBrand: stringParam(searchParams, QUERY_KEYS.fareBrand),
    refundable: booleanParam(searchParams, QUERY_KEYS.refundable),
    expiration: stringParam(searchParams, QUERY_KEYS.expiration),
    carryOn: booleanParam(searchParams, QUERY_KEYS.carryOn),
    checkedBags: numberParam(searchParams, QUERY_KEYS.checkedBags),
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
      if (Number.isFinite(value) && value > 0) compact[key] = value as never
    } else if (typeof value === 'boolean') {
      compact[key] = value as never
    }
  }
  return compact
}

function appendString(params: URLSearchParams, key: string, value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return
  params.set(key, value.trim())
}

function appendNumber(params: URLSearchParams, key: string, value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return
  params.set(key, String(value))
}

function appendBoolean(params: URLSearchParams, key: string, value: unknown) {
  if (typeof value !== 'boolean') return
  params.set(key, value ? '1' : '0')
}

function stringParam(params: SearchParams, key: string): string | undefined {
  const value = Array.isArray(params[key]) ? params[key]?.[0] : params[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberParam(params: SearchParams, key: string): number | undefined {
  const value = stringParam(params, key)
  if (!value) return undefined
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function booleanParam(params: SearchParams, key: string): boolean | undefined {
  const value = stringParam(params, key)
  if (!value) return undefined
  if (value === '1' || value.toLowerCase() === 'true') return true
  if (value === '0' || value.toLowerCase() === 'false') return false
  return undefined
}
