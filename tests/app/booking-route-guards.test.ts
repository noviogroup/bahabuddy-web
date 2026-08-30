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
import StayCheckoutPage from '@/app/stays/[hotelId]/checkout/page'
import FlightOfferBookPage from '@/app/flights/[offerId]/book/page'
import FlightOfferConfirmationPage from '@/app/flights/[offerId]/confirmation/page'

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

function supabaseWithFlightProfile(
  user: {
    id: string
    email?: string | null
    phone?: string | null
    user_metadata?: Record<string, unknown> | null
  },
  profile: { display_name?: string | null; email?: string | null; country?: string | null } | null,
) {
  const tripsQuery = {
    select: vi.fn(() => tripsQuery),
    eq: vi.fn(() => tripsQuery),
    order: vi.fn(() => tripsQuery),
    limit: vi.fn().mockResolvedValue({ data: [{ id: 'trip-1', name: 'Summer Bahamas' }], error: null }),
  }
  const profileQuery = {
    select: vi.fn(() => profileQuery),
    eq: vi.fn(() => profileQuery),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((table: string) => (table === 'users' ? profileQuery : tripsQuery)),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('booking route auth guards', () => {
  test('keeps the planned stay checkout route as a compatibility redirect', () => {
    expect(() => StayCheckoutPage({
      params: { hotelId: 'hotel-123' },
      searchParams: {
        rate_id: 'rate-abc',
        checkin: '2026-08-01',
        checkout: '2026-08-04',
        amount: '126000',
        currency: 'USD',
      },
    })).toThrow('NEXT_REDIRECT')

    expect(routeMocks.redirect).toHaveBeenCalledWith(
      '/stays/hotel-123/guests?rate_id=rate-abc&checkin=2026-08-01&checkout=2026-08-04&amount=126000&currency=USD',
    )
  })

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

  test('preserves already encoded flight offer IDs in booking return URLs', async () => {
    routeMocks.createClient.mockResolvedValue(supabaseWithUser(null))

    await expect(FlightOfferBookPage({
      params: { offerId: 'lite-offer%3D%3D' },
      searchParams: {
        route: 'MIA to NAS',
        airline: 'American Airlines',
      },
    })).rejects.toThrow('NEXT_REDIRECT')

    const redirectUrl = routeMocks.redirect.mock.calls[0]?.[0] ?? ''
    expect(redirectUrl).toContain('lite-offer%253D%253D')
    expect(redirectUrl).toContain('route%3DMIA%2Bto%2BNAS')
    expect(redirectUrl).not.toContain('lite-offer%25253D%25253D')
  })

  test('passes flight traveler defaults from profile and auth data into checkout', async () => {
    const supabase = supabaseWithFlightProfile(
      {
        id: 'user-1',
        email: 'auth@example.com',
        phone: '+12425551212',
        user_metadata: { display_name: 'Valdez Williams' },
      },
      {
        display_name: null,
        email: 'valdez@noviogroup.com',
        country: 'The Bahamas',
      },
    )
    routeMocks.createClient.mockResolvedValue(supabase)

    const result = await FlightOfferBookPage({
      params: { offerId: 'lite-offer-123' },
      searchParams: {
        route: 'MIA to NAS',
        price: '404',
        currency: 'USD',
      },
    })
    const props = (result as { props: { profileDefaults: unknown } }).props

    expect(props.profileDefaults).toMatchObject({
      firstName: 'Valdez',
      lastName: 'Williams',
      email: 'valdez@noviogroup.com',
      phoneCountryCode: '1',
      phoneNumber: '2425551212',
      countryCode: 'BS',
    })
    expect(supabase.from).toHaveBeenCalledWith('trips')
    expect(supabase.from).toHaveBeenCalledWith('users')
  })

  test('redirects unauthenticated flight confirmation to login with return URL', async () => {
    routeMocks.createClient.mockResolvedValue(supabaseWithUser(null))

    await expect(FlightOfferConfirmationPage({
      params: { offerId: 'lite-offer-123' },
      searchParams: { tripId: 'trip-1', bookingId: 'booking-1' },
    })).rejects.toThrow('NEXT_REDIRECT')

    expect(routeMocks.redirect).toHaveBeenCalledWith(
      '/login?redirect=%2Fflights%2Flite-offer-123%2Fconfirmation%3FtripId%3Dtrip-1%26bookingId%3Dbooking-1',
    )
  })

  test('redirects flight confirmation without booking identifiers back to checkout', async () => {
    routeMocks.createClient.mockResolvedValue(supabaseWithUser({ id: 'user-1' }))

    await expect(FlightOfferConfirmationPage({
      params: { offerId: 'lite-offer-123' },
      searchParams: {},
    })).rejects.toThrow('NEXT_REDIRECT')

    expect(routeMocks.redirect).toHaveBeenCalledWith('/flights/lite-offer-123/book')
  })
})
