import { describe, expect, it } from 'vitest'
import type { CardData } from '@/components/RichCards'
import {
  isNonstopFlight,
  parseFlightDurationMinutes,
  parseFlightStopCount,
  rankFlightResults,
} from '@/lib/flight-result-filters'

const flight = (overrides: Partial<CardData>): CardData => ({
  card_type: 'flight',
  airline: 'Test Air',
  route: 'MIA to NAS',
  price: 300,
  duration: '2h 0m',
  stops: 'Direct',
  ...overrides,
})

describe('flight result filters', () => {
  it('parses provider-style duration and stop labels', () => {
    expect(parseFlightDurationMinutes('2h 35m')).toBe(155)
    expect(parseFlightDurationMinutes('1.5 hours')).toBe(90)
    expect(parseFlightDurationMinutes('03:20')).toBe(200)
    expect(parseFlightStopCount('Direct')).toBe(0)
    expect(parseFlightStopCount('2 stops')).toBe(2)
  })

  it('sorts cheapest fares by total price first', () => {
    const ranked = rankFlightResults([
      flight({ provider_offer_id: 'middle', price: 275 }),
      flight({ provider_offer_id: 'lowest', price: 180, duration: '4h 0m', stops: '1 stop' }),
      flight({ provider_offer_id: 'highest', price: 400, duration: '1h 10m' }),
    ], 'cheapest')

    expect(ranked.map((card) => card.provider_offer_id)).toEqual(['lowest', 'middle', 'highest'])
  })

  it('sorts fastest fares by duration before price', () => {
    const ranked = rankFlightResults([
      flight({ provider_offer_id: 'cheap-slow', price: 150, duration: '4h 10m', stops: '1 stop' }),
      flight({ provider_offer_id: 'fast', price: 425, duration: '1h 5m' }),
      flight({ provider_offer_id: 'middle', price: 280, duration: '2h 0m' }),
    ], 'fastest')

    expect(ranked.map((card) => card.provider_offer_id)).toEqual(['fast', 'middle', 'cheap-slow'])
  })

  it('filters nonstop fares only', () => {
    const ranked = rankFlightResults([
      flight({ provider_offer_id: 'connecting', stops: '1 stop' }),
      flight({ provider_offer_id: 'direct', stops: 'Direct' }),
      flight({ provider_offer_id: 'nonstop', stops: 'Nonstop' }),
    ], 'nonstop')

    expect(ranked.map((card) => card.provider_offer_id)).toEqual(['direct', 'nonstop'])
    expect(ranked.every(isNonstopFlight)).toBe(true)
  })

  it('balances best fares across price, duration, and stops', () => {
    const ranked = rankFlightResults([
      flight({ provider_offer_id: 'very-cheap-long', price: 120, duration: '9h 0m', stops: '2 stops' }),
      flight({ provider_offer_id: 'balanced', price: 240, duration: '1h 15m', stops: 'Direct' }),
      flight({ provider_offer_id: 'expensive-fast', price: 700, duration: '1h 5m', stops: 'Direct' }),
    ], 'best')

    expect(ranked[0]?.provider_offer_id).toBe('balanced')
  })
})
