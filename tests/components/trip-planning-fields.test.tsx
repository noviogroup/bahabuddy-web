import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import TripBuilder from '@/components/TripBuilder'
import CreateTripPageClient from '@/components/trip/CreateTripPageClient'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  createTripAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/app/actions/create-trip', () => ({
  createTripAction: mocks.createTripAction,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select() { return this },
      limit() { return this },
      ilike() { return this },
      then(resolve: (value: { data: unknown[] }) => unknown) {
        return Promise.resolve(resolve({ data: [] }))
      },
    }),
  }),
}))

describe('trip planning form fields', () => {
  beforeEach(() => {
    mocks.push.mockClear()
    mocks.createTripAction.mockReset()
  })

  test('direct trip creation uses accessible marketplace-style preference fields', () => {
    render(<CreateTripPageClient seed="food, beaches, and a quiet hotel" />)

    const preferences = screen.getByLabelText('Trip preferences')
    expect(preferences).toBeInTheDocument()
    expect(preferences).toHaveValue('food, beaches, and a quiet hotel')
    expect(screen.getByText('Optional trip notes')).toBeInTheDocument()
  })

  test('direct trip creation can preselect a destination from route context', () => {
    render(<CreateTripPageClient initialDestinationSlug="the-exumas" seed="island hopping" />)

    expect(screen.getByRole('button', { name: /The Exumas/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Trip preferences')).toHaveValue('island hopping')
  })

  test('trip builder exposes modern trip basics controls', () => {
    render(<TripBuilder />)

    expect(screen.getByLabelText('Trip name')).toHaveAttribute('placeholder', 'e.g. Bahamas Summer 2026')
    expect(screen.getByLabelText('Main island')).toHaveValue('Nassau')
  })

  test('activity modal exposes modern search and custom activity fields', async () => {
    render(<TripBuilder />)

    fireEvent.click(screen.getAllByText('+ Add')[0])

    expect(await screen.findByLabelText('Search attractions')).toHaveAttribute(
      'placeholder',
      'Search beaches, tours, food, culture',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Custom' }))

    expect(screen.getByLabelText('Activity name')).toHaveAttribute(
      'placeholder',
      'Beach walk, dinner at Graycliff',
    )
    expect(screen.getByLabelText('Notes')).toHaveAttribute('placeholder', 'Any details, reminders, or links')

    expect(screen.getByRole('button', { name: 'Add to Day 1' })).toBeDisabled()
  })

  test('create trip is the default submit path and opens the canonical trip record', async () => {
    mocks.createTripAction.mockResolvedValue({
      ok: true,
      tripId: 'trip-123',
      seedQuery: 'unused Buddy seed',
    })

    render(<CreateTripPageClient initialDestinationSlug="the-exumas" seed="quiet beaches and food" />)

    expect(screen.getByText(/Default path: create the trip record now/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create trip' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('button', { name: 'Create trip, then ask Buddy' })).toHaveClass('border-gray-300')

    fireEvent.click(screen.getByRole('button', { name: 'Create trip' }))

    await waitFor(() => expect(mocks.createTripAction).toHaveBeenCalledTimes(1))
    expect(mocks.createTripAction).toHaveBeenCalledWith({
      destinationSlug: 'the-exumas',
      dateStart: null,
      dateEnd: null,
      preferences: 'quiet beaches and food',
    })
    expect(mocks.push).toHaveBeenCalledWith('/trip/trip-123')
    expect(mocks.push).not.toHaveBeenCalledWith(expect.stringContaining('/dashboard/chat'))
  })

  test('direct creation honors returnTo instead of opening chat', async () => {
    mocks.createTripAction.mockResolvedValue({
      ok: true,
      tripId: 'trip-456',
      seedQuery: 'unused Buddy seed',
    })

    render(
      <CreateTripPageClient
        initialDestinationSlug="nassau-paradise-island"
        returnTo="/stays/lp6558fbc7#trip-actions"
        source="stay"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create trip' }))

    await waitFor(() => expect(mocks.createTripAction).toHaveBeenCalledTimes(1))
    expect(mocks.push).toHaveBeenCalledWith('/stays/lp6558fbc7?createdTripId=trip-456#trip-actions')
    expect(mocks.push).not.toHaveBeenCalledWith(expect.stringContaining('/dashboard/chat'))
  })

  test('Buddy opens only when the explicit secondary action is selected', async () => {
    mocks.createTripAction.mockResolvedValue({
      ok: true,
      tripId: 'trip-789',
      seedQuery: 'Plan quiet beaches and dinners',
    })

    render(<CreateTripPageClient initialDestinationSlug="the-exumas" seed="quiet beaches and dinners" />)

    fireEvent.click(screen.getByRole('button', { name: 'Create trip, then ask Buddy' }))

    await waitFor(() => expect(mocks.createTripAction).toHaveBeenCalledTimes(1))
    expect(mocks.push).toHaveBeenCalledWith(
      '/dashboard/chat?trip=trip-789&q=Plan+quiet+beaches+and+dinners',
    )
    expect(mocks.push).not.toHaveBeenCalledWith('/trip/trip-789')
  })
})
