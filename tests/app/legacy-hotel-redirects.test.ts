import { beforeEach, describe, expect, test, vi } from 'vitest'
import LegacyHotelPage from '@/app/hotel/page'
import LegacyHotelDetailPage from '@/app/hotel/[hotelId]/page'
import LegacyHotelsPage from '@/app/hotels/page'
import LegacyHotelsDetailPage, { generateMetadata as legacyHotelsDetailMetadata } from '@/app/hotels/[id]/page'
import GuidedDayPage from '@/app/guided-day/page'

const routeMocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}))

// Legacy routes must issue permanent (308) redirects so link equity moves to /stays.
vi.mock('next/navigation', () => ({
  permanentRedirect: routeMocks.redirect,
  redirect: () => {
    throw new Error('legacy routes must use permanentRedirect')
  },
}))

describe('legacy hotel route redirects', () => {
  beforeEach(() => {
    routeMocks.redirect.mockClear()
  })

  test('redirects singular hotel listing route into canonical stays with query context', () => {
    LegacyHotelPage({
      searchParams: {
        island: 'Abaco',
        sort: 'stars',
        ignored: undefined,
      },
    })

    expect(routeMocks.redirect).toHaveBeenCalledWith('/stays?island=Abaco&sort=stars')
  })

  test('redirects plural hotels listing route into canonical stays with query context', () => {
    LegacyHotelsPage({
      searchParams: {
        island: 'Nassau',
        type: 'House',
      },
    })

    expect(routeMocks.redirect).toHaveBeenCalledWith('/stays?island=Nassau&type=House')
  })

  test('redirects singular hotel detail route into canonical stay detail without dropping booking params', () => {
    LegacyHotelDetailPage({
      params: { hotelId: 'lp6558fbc7' },
      searchParams: {
        checkin: '2026-07-03',
        checkout: '2026-07-08',
        adults: '2',
        rooms: '1',
      },
    })

    expect(routeMocks.redirect).toHaveBeenCalledWith(
      '/stays/lp6558fbc7?checkin=2026-07-03&checkout=2026-07-08&adults=2&rooms=1',
    )
  })

  test('redirects plural hotels detail route into canonical stay detail without dropping booking params', () => {
    LegacyHotelsDetailPage({
      params: { id: 'legacy hotel/id' },
      searchParams: {
        rate_id: 'rate-123',
        currency: 'USD',
      },
    })

    expect(routeMocks.redirect).toHaveBeenCalledWith(
      '/stays/legacy%20hotel%2Fid?rate_id=rate-123&currency=USD',
    )
  })

  test('redirects from generateMetadata too, so the 308 is sent before streaming starts', () => {
    legacyHotelsDetailMetadata({ params: { id: 'abc' }, searchParams: { adults: '2' } })
    expect(routeMocks.redirect).toHaveBeenCalledWith('/stays/abc?adults=2')
  })

  test('redirects the retired guided-day route to cruise itineraries', () => {
    GuidedDayPage()
    expect(routeMocks.redirect).toHaveBeenCalledWith('/nassau-cruise-itineraries')
  })
})
