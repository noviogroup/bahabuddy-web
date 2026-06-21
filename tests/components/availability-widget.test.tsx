import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import AvailabilityWidget from '@/components/stays/AvailabilityWidget'

function mockRatesResponse() {
  return new Response(JSON.stringify({
    nights: 3,
    rates: [{
      rooms: [{
        rate_id: 'rate-123',
        name: 'Ocean King',
        board_type: 'Breakfast included',
        currency: 'USD',
        total_price: 1200,
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
      />,
    )

    expect(screen.getByLabelText('Check-in')).toHaveValue('2026-08-01')
    expect(screen.getByLabelText('Check-out')).toHaveValue('2026-08-04')
    expect(screen.getByLabelText('Adults')).toHaveValue('2')
    expect(screen.getByLabelText('Children')).toHaveValue('1')
    expect(screen.getByLabelText('Rooms')).toHaveValue('2')
    expect(screen.getByText('3 travelers')).toBeInTheDocument()
    expect(screen.getAllByText('2 rooms').length).toBeGreaterThanOrEqual(1)

    const checkRatesButton = screen.getByRole('button', { name: 'Check rates' })
    expect(checkRatesButton).toHaveClass('bg-brand-600')
    expect(checkRatesButton.querySelector('.bg-gold-400')).toBeTruthy()
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
    expect(bookLink).toHaveClass('bg-brand-600')
    expect(bookLink.querySelector('.bg-gold-400')).toBeTruthy()
    expect(bookLink).toHaveAttribute(
      'href',
      '/stays/hotel-123/guests?rate_id=rate-123&checkin=2026-08-01&checkout=2026-08-04&adults=2&children=1&rooms=2&room=Ocean+King&amount=120000&currency=USD&hotel_name=Goldwynn+Resort',
    )
  })
})
