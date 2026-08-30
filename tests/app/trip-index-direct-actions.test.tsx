import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import TripIndexPage from '@/app/(dashboard)/trip/page'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  fetchVisibleTrips: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('@/lib/trips/visible-trips', () => ({
  fetchVisibleTrips: mocks.fetchVisibleTrips,
}))

vi.mock('@/components/TripCard', () => ({
  default: ({ trip }: { trip: { name?: string } }) => (
    <article>{trip.name ?? 'Trip card'}</article>
  ),
}))

function mockSupabase(trips: unknown[] = []) {
  mocks.fetchVisibleTrips.mockResolvedValue(trips)
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'traveler@example.com' } },
      }),
    },
  })
}

describe('TripIndexPage direct trip actions', () => {
  beforeEach(() => {
    mocks.createClient.mockReset()
    mocks.fetchVisibleTrips.mockReset()
    mocks.redirect.mockClear()
  })

  test('uses direct trip creation as the primary no-trip action', async () => {
    mockSupabase([])

    render(await TripIndexPage())

    expect(mocks.fetchVisibleTrips).toHaveBeenCalledWith(
      expect.objectContaining({ auth: expect.any(Object) }),
      'user-123',
    )

    const newTrip = screen.getByRole('link', { name: 'New trip' })
    expect(newTrip).toHaveAttribute(
      'href',
      '/dashboard/trips/new?returnTo=%2Ftrip&source=trip_index',
    )
    expect(newTrip).toHaveClass('bg-brand-600')
    expect(newTrip.querySelector('.bg-gold-400')).not.toBeInTheDocument()

    const createTrip = screen.getByRole('link', { name: /Create trip/i })
    expect(createTrip).toHaveAttribute(
      'href',
      '/dashboard/trips/new?returnTo=%2Ftrip&source=trip_index',
    )
    expect(createTrip).toHaveClass('bg-brand-600')
    expect(createTrip.querySelector('.bg-gold-400')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ask Buddy first' })).toHaveAttribute(
      'href',
      expect.stringContaining('/dashboard/chat?q='),
    )
    expect(screen.getByRole('link', { name: 'Ask Buddy first' })).toHaveClass('border-gray-300')
    expect(document.body.innerHTML).not.toMatch(/bg-night|hover:bg-gray-900/)
    expect(screen.queryByText('Your first Bahamas trip is one chat away')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Start planning with Buddy' })).not.toBeInTheDocument()
  })
})
