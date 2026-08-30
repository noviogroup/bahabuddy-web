import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import AvailabilityWidget from '@/components/stays/AvailabilityWidget'

function mockRatesResponse(imageUrls: string[] = ['https://static.cupid.travel/hotels/ocean-king.jpg']) {
  return new Response(JSON.stringify({
    nights: 3,
    rates: [{
      rooms: [{
        rate_id: 'rate-123',
        name: 'Ocean King',
        board_type: 'Breakfast included',
        currency: 'USD',
        total_price: 1200,
        image_urls: imageUrls,
        cancellation_summary: 'Free cancellation until 2026-07-25',
      }],
    }],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function requestBody(call: unknown[]) {
  const init = call[1] as RequestInit
  return JSON.parse(String(init.body))
}

describe('AvailabilityWidget', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('prefills search context and carries it into rate lookup and guest details', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => mockRatesResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AvailabilityWidget
        hotelId="hotel-123"
        hotelName="Goldwynn Resort"
        initialCheckin="2026-08-01"
        initialCheckout="2026-08-04"
        initialAdults={2}
        initialChildren={1}
        initialRooms={2}
        roomImageUrls={['https://static.cupid.travel/hotels/goldwynn-room.jpg']}
      />,
    )

    const dateButton = screen.getByRole('button', { name: 'Choose stay dates' })
    expect(dateButton).toHaveTextContent('Aug 1')
    expect(dateButton).toHaveTextContent('Aug 4')
    expect(screen.getByRole('button', { name: 'Choose guests' })).toHaveTextContent('2 adults, 1 child')
    expect(screen.getByRole('button', { name: 'Choose rooms' })).toHaveTextContent('2 rooms')
    expect(screen.getByText('3 travelers')).toBeInTheDocument()
    expect(screen.getAllByText('2 rooms').length).toBeGreaterThanOrEqual(1)

    fireEvent.click(screen.getByRole('button', { name: 'Choose guests' }))
    expect(screen.getByRole('dialog', { name: 'Guest count' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decrease adults' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Increase children' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Choose rooms' }))
    expect(screen.queryByRole('dialog', { name: 'Guest count' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Room count' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Decrease rooms' }))
    expect(screen.getByRole('button', { name: 'Choose rooms' })).toHaveTextContent('1 room')
    fireEvent.click(screen.getByRole('button', { name: 'Increase rooms' }))
    expect(screen.getByRole('button', { name: 'Choose rooms' })).toHaveTextContent('2 rooms')

    const checkRatesButton = screen.getByRole('button', { name: 'Check rates' })
    expect(checkRatesButton).toHaveClass('bg-brand-600')
    expect(checkRatesButton.querySelector('.bg-gold-400')).toBeNull()
    fireEvent.click(checkRatesButton)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [requestUrl, requestInit] = fetchMock.mock.calls[0]
    expect(requestUrl).toBe('/api/booking/hotels/rates')
    expect(requestBody([requestUrl, requestInit])).toMatchObject({
      hotelIds: ['hotel-123'],
      checkin: '2026-08-01',
      checkout: '2026-08-04',
      adults: 2,
      children: [10],
      rooms: 2,
    })

    const bookLink = await screen.findByRole('link', { name: 'Book this room' })
    expect(screen.getByAltText('Goldwynn Resort property photo 1')).toHaveAttribute(
      'src',
      'https://static.cupid.travel/hotels/goldwynn-room.jpg',
    )
    expect(screen.getByAltText('Ocean King room photo at Goldwynn Resort')).toHaveAttribute(
      'src',
      'https://static.cupid.travel/hotels/ocean-king.jpg',
    )
    expect(screen.getByText('Room photo')).toBeInTheDocument()
    expect(bookLink).toHaveClass('bg-brand-600')
    expect(bookLink.querySelector('.bg-gold-400')).toBeNull()
    expect(bookLink).toHaveAttribute(
      'href',
      '/stays/hotel-123/guests?rate_id=rate-123&checkin=2026-08-01&checkout=2026-08-04&adults=2&children=1&rooms=2&room=Ocean+King&amount=120000&currency=USD&hotel_name=Goldwynn+Resort',
    )
  })

  test('does not use property gallery photos as room option images', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => mockRatesResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AvailabilityWidget
        hotelId="hotel-123"
        hotelName="Goldwynn Resort"
        initialCheckin="2026-08-01"
        initialCheckout="2026-08-04"
        initialAdults={2}
        initialRooms={1}
        roomImageUrls={['https://static.cupid.travel/hotels/goldwynn-property.jpg']}
      />,
    )

    expect(screen.getByAltText('Goldwynn Resort property photo 1')).toHaveAttribute(
      'src',
      'https://static.cupid.travel/hotels/goldwynn-property.jpg',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Check rates' }))

    await screen.findByText('Room photo coming soon')
    expect(screen.getByText('This live rate does not include a room-specific image.')).toBeInTheDocument()
    expect(screen.queryByAltText('Ocean King room photo at Goldwynn Resort')).not.toBeInTheDocument()
    expect(screen.queryByText('Room photo')).not.toBeInTheDocument()
  })
})
