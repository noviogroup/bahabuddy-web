import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import CheckoutSuccessPage from '@/app/(dashboard)/checkout/success/page'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  trackView: vi.fn(() => null),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('@/components/TrackView', () => ({
  default: mocks.trackView,
}))

type BookingFixture = {
  id: string
  trip_id: string
  booking_type: string
  status: string | null
  amount: number | null
  currency: string | null
  paid_at: string | null
  stripe_payment_intent_id: string | null
}

type TripFixture = {
  id: string
  name: string
  hero_image_url: string | null
}

class MockTableQuery {
  constructor(
    private readonly table: string,
    private readonly rows: { bookings: BookingFixture | null; trips: TripFixture | null },
  ) {}

  select = vi.fn(() => this)
  eq = vi.fn(() => this)

  single = vi.fn(() => Promise.resolve({
    data: this.table === 'bookings' ? this.rows.bookings : this.rows.trips,
    error: null,
  }))
}

function setupSupabase({
  user = { id: 'user-1' },
  booking,
  trip,
}: {
  user?: { id: string } | null
  booking: BookingFixture | null
  trip: TripFixture | null
}) {
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: (table: string) => new MockTableQuery(table, { bookings: booking, trips: trip }),
  })
}

function expectNoLegacySuccessChrome(container: HTMLElement) {
  expect(container.innerHTML).not.toMatch(/bg-gradient-to-br|shadow-card|bg-night|rounded-\[2rem\]/)
  expect(container.innerHTML).not.toContain('You&apos;re booked')
}

const trip = {
  id: 'trip-1',
  name: 'Summer Bahamas',
  hero_image_url: null,
}

const confirmedBooking = {
  id: 'booking-1',
  trip_id: 'trip-1',
  booking_type: 'hotel',
  status: 'confirmed',
  amount: 126000,
  currency: 'USD',
  paid_at: '2026-06-20T18:00:00.000Z',
  stripe_payment_intent_id: 'pi_confirmed',
}

describe('dashboard checkout success compact layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders confirmed checkout with compact status header and direct actions', async () => {
    setupSupabase({ booking: confirmedBooking, trip })

    const page = await CheckoutSuccessPage({
      searchParams: {
        payment_intent: 'pi_confirmed',
        redirect_status: 'succeeded',
        trip_id: 'trip-1',
      },
    })
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: 'Payment confirmed' })).toBeInTheDocument()
    expect(screen.getByText('Booking confirmed.')).toBeInTheDocument()
    expect(screen.getByText('Payment: Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Booking: confirmed')).toBeInTheDocument()
    expect(screen.getByText('Trip: Summer Bahamas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View trip' })).toHaveAttribute('href', '/trip/trip-1')
    expect(screen.getByRole('link', { name: 'View trip' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Open trip review' })).toHaveAttribute('href', '/trip/trip-1')
    expect(screen.getAllByText('Confirmation').length).toBeGreaterThan(0)
    expect(mocks.trackView).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'booking_completed',
        props: expect.objectContaining({ trip_id: 'trip-1', booking_type: 'hotel' }),
      }),
      {},
    )
    expectNoLegacySuccessChrome(container)
  })

  test('does not show confirmed copy when Stripe succeeded but booking row is pending', async () => {
    setupSupabase({
      booking: { ...confirmedBooking, status: 'pending', stripe_payment_intent_id: 'pi_pending' },
      trip,
    })

    const page = await CheckoutSuccessPage({
      searchParams: {
        payment_intent: 'pi_pending',
        redirect_status: 'succeeded',
        trip_id: 'trip-1',
      },
    })
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: 'Payment received, booking still checking' })).toBeInTheDocument()
    expect(screen.getByText('Payment: Checking')).toBeInTheDocument()
    expect(screen.getByText('Booking: pending')).toBeInTheDocument()
    expect(screen.getByText('Wait for the booking to confirm.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Payment confirmed' })).not.toBeInTheDocument()
    expect(mocks.trackView).not.toHaveBeenCalled()
    expectNoLegacySuccessChrome(container)
  })

  test('renders failed checkout without coral gradient success/error chrome', async () => {
    setupSupabase({
      booking: { ...confirmedBooking, status: 'failed', stripe_payment_intent_id: 'pi_failed' },
      trip,
    })

    const page = await CheckoutSuccessPage({
      searchParams: {
        payment_intent: 'pi_failed',
        redirect_status: 'requires_payment_method',
        trip_id: 'trip-1',
      },
    })
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: 'Payment did not go through' })).toBeInTheDocument()
    expect(screen.getByText('Payment: Failed')).toBeInTheDocument()
    expect(screen.getByText('No confirmed booking was created.')).toBeInTheDocument()
    expect(screen.queryByText('Payment didn\'t go through')).not.toBeInTheDocument()
    expectNoLegacySuccessChrome(container)
  })

  test('redirects unauthenticated checkout success to login', async () => {
    setupSupabase({ user: null, booking: null, trip: null })

    await expect(CheckoutSuccessPage({
      searchParams: { payment_intent: 'pi_1', redirect_status: 'succeeded', trip_id: 'trip-1' },
    })).rejects.toThrow('NEXT_REDIRECT:/login')
  })
})
