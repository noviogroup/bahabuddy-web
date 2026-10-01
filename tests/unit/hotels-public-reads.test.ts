import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  callTravelProvider: vi.fn(),
  createPublicClient: vi.fn(),
  createCookieClient: vi.fn(),
  unstableCache: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown, keyParts: string[], options: unknown) => {
    mocks.unstableCache(keyParts, options)
    return fn
  },
}))

vi.mock('@/lib/travel-booking/provider', () => ({
  callTravelProvider: mocks.callTravelProvider,
}))

vi.mock('@/lib/supabase/public', () => ({
  createPublicClient: mocks.createPublicClient,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createCookieClient,
}))

import {
  getIslandOptions,
  getLiveHotelPhotoUrls,
  getStayStartingRates,
  withProviderTimeout,
} from '@/lib/hotels'

function rateResponse(hotelIds: string[]) {
  return {
    status: 200,
    data: {
      data: hotelIds.map((hotelId) => ({
        hotelId,
        roomTypes: [{ offerRetailRate: { amount: 300, currency: 'USD' } }],
      })),
    },
  }
}

describe('hotels public catalog reads', () => {
  beforeEach(() => {
    mocks.callTravelProvider.mockReset()
    mocks.createPublicClient.mockReset()
    mocks.createCookieClient.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('filter options read through the cookie-free public client and are cached', async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      not: vi.fn(async () => ({ data: [{ island: 'Nassau' }, { island: 'Exuma' }], error: null })),
    }
    mocks.createPublicClient.mockReturnValue({ from: vi.fn(() => query) })

    await expect(getIslandOptions()).resolves.toEqual(expect.arrayContaining(['Nassau']))
    expect(mocks.createPublicClient).toHaveBeenCalled()
    expect(mocks.createCookieClient).not.toHaveBeenCalled()
    expect(mocks.unstableCache).toHaveBeenCalledWith(
      ['hotel-island-options'],
      expect.objectContaining({ tags: expect.arrayContaining(['hotels']) }),
    )
  })

  test('filter options fall back to an empty list when Supabase errors', async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      not: vi.fn(async () => ({ data: null, error: new Error('boom') })),
    }
    mocks.createPublicClient.mockReturnValue({ from: vi.fn(() => query) })

    await expect(getIslandOptions()).resolves.toEqual([])
  })

  test('starting-rate chunks run in parallel and one failed chunk keeps the rest', async () => {
    const hotelIds = Array.from({ length: 20 }, (_, index) => `h${index}`)
    let inFlight = 0
    let maxInFlight = 0
    mocks.callTravelProvider.mockImplementation(async (_path: string, body: { hotelIds: string[] }) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight -= 1
      if (body.hotelIds.includes('h8')) throw new Error('provider down')
      return rateResponse(body.hotelIds)
    })

    const rates = await getStayStartingRates({
      hotelIds,
      checkin: '2026-12-01',
      checkout: '2026-12-03',
    })

    expect(mocks.callTravelProvider).toHaveBeenCalledTimes(3)
    expect(maxInFlight).toBe(3)
    expect(rates.has('h0')).toBe(true)
    expect(rates.has('h8')).toBe(false)
    expect(rates.has('h16')).toBe(true)
    expect(rates.get('h0')?.nightly).toBe(150)
  })

  test('a hung provider call is bounded by the display timeout', async () => {
    vi.useFakeTimers()
    const pending = withProviderTimeout(new Promise(() => {}), 4000)
    const assertion = expect(pending).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(4000)
    await assertion
  })

  test('live photo lookups degrade to an empty gallery on provider failure', async () => {
    mocks.callTravelProvider.mockRejectedValue(new Error('provider down'))
    await expect(getLiveHotelPhotoUrls('lp-1', 8)).resolves.toEqual([])
    expect(mocks.unstableCache).toHaveBeenCalledWith(
      ['hotel-live-photo-urls'],
      expect.objectContaining({ revalidate: 86400 }),
    )
  })
})
