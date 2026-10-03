import { describe, expect, it, vi } from 'vitest'

import {
  TRIP_STYLES_CHANGE_EVENT,
  TRIP_STYLES_STORAGE_KEY,
  hotelPriceTier,
  inferHotelTripStyles,
  matchesTripStyles,
  parseTripStyles,
  rankByTripStyles,
  readStoredTripStyles,
  tripStyleHeading,
  tripStyleScore,
  writeStoredTripStyles,
  type TripStyleFit,
} from '@/lib/trip-styles'

type Item = TripStyleFit & { id: string }

const items: Item[] = [
  { id: 'a', tripStyles: ['adventure'], priceTier: 'mid' },
  { id: 'b', tripStyles: ['family', 'beach-fun'], priceTier: 'value' },
  { id: 'c', tripStyles: [], priceTier: 'luxury' },
  { id: 'd', tripStyles: ['luxury', 'romance'], priceTier: 'luxury' },
  { id: 'e', tripStyles: ['family'], priceTier: 'premium' },
  { id: 'f' },
]

const ids = (list: readonly Item[]) => list.map((item) => item.id)

describe('parseTripStyles', () => {
  it('keeps valid slugs once, in canonical order, from arrays, JSON and CSV', () => {
    expect(parseTripStyles(['family', 'luxury', 'family', 'bogus'])).toEqual(['luxury', 'family'])
    expect(parseTripStyles('["romance","adventure"]')).toEqual(['romance', 'adventure'])
    expect(parseTripStyles(' Food-Culture, nightlife ,,x')).toEqual(['nightlife', 'food-culture'])
    expect(parseTripStyles('[not json')).toEqual([])
    expect(parseTripStyles(null)).toEqual([])
    expect(parseTripStyles(42)).toEqual([])
  })
})

describe('rankByTripStyles', () => {
  it('returns the very same list when no style is chosen', () => {
    expect(rankByTripStyles(items, [], (item) => item)).toBe(items)
  })

  it('puts matching items first and keeps the original order for ties', () => {
    expect(ids(rankByTripStyles(items, ['family'], (item) => item))).toEqual(['b', 'e', 'a', 'c', 'd', 'f'])
  })

  it('ranks more style matches higher, then uses price tier as a tie-breaker', () => {
    // d matches both styles; c has no tag but a luxury tier, so it beats the
    // untagged rest without outranking a real tag match.
    expect(ids(rankByTripStyles(items, ['luxury', 'romance'], (item) => item))).toEqual(['d', 'c', 'e', 'a', 'b', 'f'])
    expect(tripStyleScore({ tripStyles: ['luxury'] }, ['luxury'])).toBeGreaterThan(
      tripStyleScore({ tripStyles: [], priceTier: 'luxury' }, ['luxury', 'romance']),
    )
  })

  it('does not mutate the input', () => {
    const copy = [...items]
    rankByTripStyles(items, ['adventure'], (item) => item)
    expect(items).toEqual(copy)
  })
})

describe('matchesTripStyles', () => {
  it('matches any chosen style, and everything when none is chosen', () => {
    expect(matchesTripStyles({ tripStyles: ['family'] }, ['family', 'romance'])).toBe(true)
    expect(matchesTripStyles({ tripStyles: ['adventure'] }, ['family'])).toBe(false)
    expect(matchesTripStyles({}, [])).toBe(true)
  })
})

describe('tripStyleHeading', () => {
  it('names one or two styles and stays generic for more', () => {
    expect(tripStyleHeading([])).toBeNull()
    expect(tripStyleHeading(['family'])).toBe('Picks for your family trip')
    expect(tripStyleHeading(['romance', 'beach-fun'])).toBe('Picks for your romantic & beach trip')
    expect(tripStyleHeading(['luxury', 'family', 'adventure'])).toBe('Picks for your kind of trip')
  })
})

describe('stay fit helpers', () => {
  it('derives styles from hotel card facts', () => {
    expect(inferHotelTripStyles({
      name: 'Coral Cove Beach Resort',
      property_type_name: 'Resort',
      amenities: ['Kids club', 'Casino', 'Scuba diving'],
      star_rating: 5,
    })).toEqual(['luxury', 'nightlife', 'beach-fun', 'family', 'celebration', 'adventure'])
    expect(inferHotelTripStyles({ name: 'Harbour Inn', amenities: ['Wifi'], star_rating: 3 })).toEqual([])
    // Substrings inside other words do not count ("barbecue" is not a bar).
    expect(inferHotelTripStyles({ name: 'Inn', amenities: ['Barbecue grill'] })).toEqual([])
  })

  it('maps star class to a price tier', () => {
    expect(hotelPriceTier(5)).toBe('luxury')
    expect(hotelPriceTier(4.5)).toBe('premium')
    expect(hotelPriceTier(3)).toBe('mid')
    expect(hotelPriceTier(2)).toBe('value')
    expect(hotelPriceTier(null)).toBeNull()
    expect(hotelPriceTier(0)).toBeNull()
  })
})

describe('stored trip styles', () => {
  it('round-trips through localStorage and broadcasts the change', () => {
    const listener = vi.fn()
    window.addEventListener(TRIP_STYLES_CHANGE_EVENT, listener)
    writeStoredTripStyles(['romance', 'luxury'])
    expect(window.localStorage.getItem(TRIP_STYLES_STORAGE_KEY)).toBe('["romance","luxury"]')
    expect(readStoredTripStyles()).toEqual(['luxury', 'romance'])
    expect(listener).toHaveBeenCalledTimes(1)
    writeStoredTripStyles([])
    expect(window.localStorage.getItem(TRIP_STYLES_STORAGE_KEY)).toBeNull()
    window.removeEventListener(TRIP_STYLES_CHANGE_EVENT, listener)
  })

  it('treats blocked storage as no choice', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    expect(readStoredTripStyles()).toEqual([])
    expect(() => writeStoredTripStyles(['family'])).not.toThrow()
  })
})
