import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  dismissTravelOriginPrompt,
  hasDismissedTravelOriginPrompt,
  normalizeTravelOrigin,
  readStoredTravelOrigin,
  saveTravelOrigin,
  TRAVEL_ORIGIN_DISMISSED_KEY,
  TRAVEL_ORIGIN_EVENT,
  TRAVEL_ORIGIN_STORAGE_KEY,
} from '@/lib/travel-origin'

describe('travel origin preference', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  test('normalizes user-entered origin text', () => {
    expect(normalizeTravelOrigin('  Fort   Lauderdale  ')).toBe('Fort Lauderdale')
    expect(normalizeTravelOrigin('\nAtlanta\t')).toBe('Atlanta')
  })

  test('saves origin, clears dismissal, and broadcasts updates', () => {
    window.localStorage.setItem(TRAVEL_ORIGIN_DISMISSED_KEY, '2026-06-19T00:00:00.000Z')
    const listener = vi.fn()
    window.addEventListener(TRAVEL_ORIGIN_EVENT, listener)

    const saved = saveTravelOrigin('  Toronto  ')

    expect(saved?.origin).toBe('Toronto')
    expect(window.localStorage.getItem(TRAVEL_ORIGIN_DISMISSED_KEY)).toBeNull()
    expect(readStoredTravelOrigin()?.origin).toBe('Toronto')
    expect(JSON.parse(window.localStorage.getItem(TRAVEL_ORIGIN_STORAGE_KEY) ?? '{}')).toMatchObject({
      origin: 'Toronto',
    })
    expect(listener).toHaveBeenCalledTimes(1)
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ origin: 'Toronto' })
  })

  test('tracks prompt dismissal separately from saved origin', () => {
    expect(hasDismissedTravelOriginPrompt()).toBe(false)

    dismissTravelOriginPrompt()

    expect(hasDismissedTravelOriginPrompt()).toBe(true)
    expect(readStoredTravelOrigin()).toBeNull()
  })
})
