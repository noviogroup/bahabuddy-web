import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import StayDetailActions from '@/components/stays/StayDetailActions'

const mockState = vi.hoisted(() => ({
  user: null as null | { id: string; email?: string },
  trips: [] as Array<{ id: string; name: string }>,
  tripError: null as null | { message: string },
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
    <StayDetailActions
      hotelId="lp6558fbc7"
      hotelName="Goldwynn Resort"
      island="Nassau"
      imageUrl="https://images.example/goldwynn.jpg"
      propertyTypeName="Resort"
      starRating={5}
      reviewScore={9.1}
    />,
  )
}

describe('StayDetailActions', () => {
  beforeEach(() => {
    mockState.user = null
    mockState.trips = []
    mockState.tripError = null
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('renders a custom trip listbox and saves the stay to the selected trip', async () => {
    mockState.user = { id: 'user-1', email: 'traveler@example.com' }
    mockState.trips = [
      { id: 'trip-1', name: 'Nassau Weekend' },
      { id: 'trip-2', name: 'Exuma Summer' },
    ]

    const fetchMock = vi.fn<typeof fetch>(async () => new Response(
      JSON.stringify({ tripId: 'trip-2', tripItemId: 'stay-1', itemType: 'stay', status: 'planned' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    renderActions()

    const checkRatesLink = screen.getByRole('link', { name: 'Check rates' })
    expect(checkRatesLink).toHaveClass('bg-brand-600')
    expect(checkRatesLink.querySelector('.bg-gold-400')).toBeTruthy()

    const trigger = await screen.findByRole('button', { name: 'Open Save to menu' })
    expect(document.querySelector('select#stay-trip-select')).toHaveClass('sr-only')

    fireEvent.click(trigger)
    fireEvent.mouseDown(within(screen.getByRole('listbox')).getByRole('option', { name: 'Exuma Summer' }))
    const addButton = screen.getByRole('button', { name: 'Add to trip' })
    expect(addButton).toHaveClass('bg-brand-600')
    expect(addButton.querySelector('.bg-gold-400')).toBeTruthy()
    fireEvent.click(addButton)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [requestUrl, requestInit] = fetchMock.mock.calls[0]
    expect(requestUrl).toBe('/api/trips/trip-2/items')
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      itemType: 'stay',
      sourceId: 'lp6558fbc7',
      sourceType: 'web_stay_detail',
      name: 'Goldwynn Resort',
      island: 'Nassau',
      provider: 'liteapi',
      providerHotelId: 'lp6558fbc7',
      imageUrl: 'https://images.example/goldwynn.jpg',
      metadata: {
        sourceSurface: 'web',
        propertyTypeName: 'Resort',
        starRating: 5,
        reviewScore: 9.1,
      },
    })
    expect(await screen.findByText('Saved to Exuma Summer.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View trip' })).toHaveAttribute('href', '/trip/trip-2')
  })
})
