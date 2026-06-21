import type { CardData } from '@/components/RichCards'

export type FlightResultMode = 'best' | 'cheapest' | 'fastest' | 'nonstop'

export const FLIGHT_RESULT_MODES: Array<{
  value: FlightResultMode
  label: string
  description: string
}> = [
  {
    value: 'best',
    label: 'Best',
    description: 'Balanced price, duration, and stops.',
  },
  {
    value: 'cheapest',
    label: 'Cheapest',
    description: 'Lowest total fare first.',
  },
  {
    value: 'fastest',
    label: 'Fastest',
    description: 'Shortest travel time first.',
  },
  {
    value: 'nonstop',
    label: 'Nonstop',
    description: 'Direct flights only.',
  },
]

export function parseFlightPrice(card: CardData): number {
  const value: unknown = card.price ?? card.cheapest_total ?? card.price_from
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.]/g, ''))
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
  }
  return Number.POSITIVE_INFINITY
}

export function parseFlightDurationMinutes(value: unknown): number {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return Number.POSITIVE_INFINITY
  }

  const normalized = value.toLowerCase().replace(/\s+/g, ' ').trim()
  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/)
  const minuteMatch = normalized.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/)
  const compactMatch = normalized.match(/^(\d{1,2}):(\d{2})$/)

  if (compactMatch) {
    return Number(compactMatch[1]) * 60 + Number(compactMatch[2])
  }

  const hours = hourMatch ? Number(hourMatch[1]) : 0
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0
  const total = Math.round(hours * 60 + minutes)

  return total > 0 ? total : Number.POSITIVE_INFINITY
}

export function parseFlightStopCount(value: unknown): number {
  if (typeof value !== 'string') return Number.POSITIVE_INFINITY

  const normalized = value.toLowerCase().trim()
  if (
    normalized === 'direct' ||
    normalized === 'nonstop' ||
    normalized === 'non-stop' ||
    normalized === '0 stops' ||
    normalized === '0 stop' ||
    normalized.includes('no stops')
  ) {
    return 0
  }

  const match = normalized.match(/(\d+)\s*stop/)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

export function isNonstopFlight(card: CardData): boolean {
  return parseFlightStopCount(card.stops) === 0
}

function normalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 1
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0
  return (value - min) / (max - min)
}

function compareFallback(a: CardData, b: CardData): number {
  const priceDelta = parseFlightPrice(a) - parseFlightPrice(b)
  if (priceDelta !== 0) return priceDelta

  const durationDelta = parseFlightDurationMinutes(a.duration) - parseFlightDurationMinutes(b.duration)
  if (durationDelta !== 0) return durationDelta

  return parseFlightStopCount(a.stops) - parseFlightStopCount(b.stops)
}

export function rankFlightResults(cards: CardData[], mode: FlightResultMode): CardData[] {
  const candidates = mode === 'nonstop' ? cards.filter(isNonstopFlight) : [...cards]

  if (mode === 'cheapest') {
    return candidates.sort(compareFallback)
  }

  if (mode === 'fastest') {
    return candidates.sort((a, b) => {
      const durationDelta = parseFlightDurationMinutes(a.duration) - parseFlightDurationMinutes(b.duration)
      if (durationDelta !== 0) return durationDelta

      const stopDelta = parseFlightStopCount(a.stops) - parseFlightStopCount(b.stops)
      if (stopDelta !== 0) return stopDelta

      return parseFlightPrice(a) - parseFlightPrice(b)
    })
  }

  const prices = candidates.map(parseFlightPrice).filter(Number.isFinite)
  const durations = candidates.map((card) => parseFlightDurationMinutes(card.duration)).filter(Number.isFinite)
  const stops = candidates.map((card) => parseFlightStopCount(card.stops)).filter(Number.isFinite)

  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const minDuration = Math.min(...durations)
  const maxDuration = Math.max(...durations)
  const minStops = Math.min(...stops)
  const maxStops = Math.max(...stops)

  return candidates.sort((a, b) => {
    const score = (card: CardData) => {
      const priceScore = normalize(parseFlightPrice(card), minPrice, maxPrice)
      const durationScore = normalize(parseFlightDurationMinutes(card.duration), minDuration, maxDuration)
      const stopScore = normalize(parseFlightStopCount(card.stops), minStops, maxStops)

      return priceScore * 0.55 + durationScore * 0.3 + stopScore * 0.15
    }

    const scoreDelta = score(a) - score(b)
    return scoreDelta !== 0 ? scoreDelta : compareFallback(a, b)
  })
}
