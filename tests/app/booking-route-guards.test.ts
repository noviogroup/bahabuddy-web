import { beforeEach, describe, expect, test, vi } from 'vitest'

const routeMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  createClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: routeMocks.redirect,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: routeMocks.createClient,
}))

import StayGuestsPage from '@/app/stays/[hotelId]/guests/page'
import FlightOfferBookPage from '@/app/flights/[offerId]/book/page'

function supabaseWithUser(user: { id: string } | null) {
  const tripsQuery = {
    select: vi.fn(() => tripsQuery),
    eq: vi.fn(() => tripsQuery),
    order: vi.fn(() => tripsQuery),
    limit: vi.fn().mockResolvedValue({ data: [{ id: 'trip-1', name: 'Summer Bahamas' }], error: null }),
  }
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn(() => tripsQuery),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('booking route auth guards', () => {
  test('redirects unauthenticated stay checkout to login with return URL', async () => {
    routeMocks.createClient.mockResolvedValue(supabaseWithUser(null))

    await expect(StayGuestsPage({
      params: { hotelId: 'hotel-123' },
      searchParams: {
        rate_id: 'rate-abc',
        checkin: '2026-08-01',
        checkout: '2026-08-04',
        amount: '126000',
        currency: 'USD',
      },
    })).rejects.toThrow('NEXT_REDIRECT')

    expect(routeMocks.redirect).toHaveBeenCalledWith(
      '/login?redirect=%2Fstays%2Fhotel-123%2Fguests%3Frate_id%3Drate-abc%26checkin%3D2026-08-01%26checkout%3D2026-08-04%26amount%3D126000%26currency%3DUSD',
    )
  })

  test('redirects invalid stay checkout params back to the stay detail page', async () => {
    routeMocks.createClient.mockResolvedValue(supabaseWithUser({ id: 'user-1' }))

    await expect(StayGuestsPage({
      params: { hotelId: 'hotel-123' },
      searchParams: {
        rate_id: '',
        checkin: '2026-08-01',
        checkout: '2026-08-04',
        amount: '126000',
      },
    })).rejects.toThrow('NEXT_REDIRECT')

    expect(routeMocks.redirect).toHaveBeenCalledWith('/stays/hotel-123')
  })

  test('redirects unauthenticated flight booking to login with return URL', async () => {
    routeMocks.createClient.mockResolvedValue(supabaseWithUser(null))

    await expect(FlightOfferBookPage({
      params: { offerId: 'lite-offer-123' },
    })).rejects.toThrow('NEXT_REDIRECT')

    expect(routeMocks.redirect).toHaveBeenCalledWith(
      '/login?redirect=%2Fflights%2Flite-offer-123%2Fbook',
    )
  })
})
