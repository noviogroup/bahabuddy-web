import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import DirectTripItemActions from '@/components/trip/DirectTripItemActions'

const mockState = vi.hoisted(() => ({
  user: null as null | { id: string; email?: string },
  trips: [] as Array<{ id: string; name: string }>,
  tripError: null as null | { message: string },
  search: '',
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockState.search),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: mockState.user } }),
    },
    from: () => ({
      select() { return this },
      eq() { return this },
      order() { return this },
      limit: async () => ({ data: mockState.trips, error: mockState.tripError }),
    }),
  }),
}))

function renderActions() {
  return render(
    <DirectTripItemActions
      itemType="restaurant"
      sourceId="rest-123"
      sourceType="web_restaurant_detail"
      name="Graycliff Restaurant"
      island="Nassau"
      imageUrl="https://images.example/graycliff.jpg"
      returnPath="/restaurants/rest-123#trip-actions"
      metadata={{ rating: 4.7 }}
    />,
  )
}

describe('DirectTripItemActions', () => {
  beforeEach(() => {
    mockState.user = null
    mockState.trips = []
    mockState.tripError = null
    mockState.search = ''
    vi.restoreAllMocks()
  })

  test('requires sign-in for guests and preserves the return path', async () => {
    const { container } = renderActions()

    expect(await screen.findByText('Sign in to save this to a trip.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in to add to trip' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Frestaurants%2Frest-123%23trip-actions',
    )
    expect(container.innerHTML).not.toMatch(/border-sand|bg-offwhite|ring-sand|border-brand|bg-brand|text-brand/)
  })

  test('sends signed-in users with no trips to direct trip creation', async () => {
    mockState.user = { id: 'user-1', email: 'traveler@example.com' }
    mockState.trips = []

    renderActions()

    expect(await screen.findByText('Create a trip before saving this item.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create trip' })).toHaveAttribute(
      'href',
      '/dashboard/trips/new?returnTo=%2Frestaurants%2Frest-123%23trip-actions&source=restaurant',
    )
  })

  test('posts the direct trip item API when saving to an existing trip', async () => {
    mockState.user = { id: 'user-1', email: 'traveler@example.com' }
    mockState.trips = [
      { id: 'trip-1', name: 'Nassau Weekend' },
      { id: 'trip-2', name: 'Exuma Summer' },
    ]
    mockState.search = 'tripId=trip-2&dayNumber=3&timeSlot=evening'

    const fetchMock = vi.fn<typeof fetch>(async () => new Response(
      JSON.stringify({ tripId: 'trip-2', tripItemId: 'activity-1', itemType: 'restaurant', status: 'planned' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    renderActions()

    expect(await screen.findByText('Timeline slot ready: Day 3 evening.')).toBeInTheDocument()

    const button = screen.getByRole('button', { name: 'Add to trip' })
    expect(button).toHaveClass('bg-brand-600')
    expect(button.querySelector('.bg-gold-400')).toBeTruthy()
    fireEvent.click(button)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [requestUrl, requestInit] = fetchMock.mock.calls[0]
    expect(requestUrl).toBe('/api/trips/trip-2/items')
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      itemType: 'restaurant',
      sourceId: 'rest-123',
      sourceType: 'web_restaurant_detail',
      name: 'Graycliff Restaurant',
      island: 'Nassau',
      dayNumber: 3,
      timeSlot: 'evening',
      imageUrl: 'https://images.example/graycliff.jpg',
      metadata: {
        sourceSurface: 'web',
        rating: 4.7,
      },
    })
    expect(await screen.findByRole('link', { name: 'View trip' })).toHaveAttribute('href', '/trip/trip-2')
  })
})
