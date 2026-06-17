import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import StayGuestBookingClient from '@/components/stays/StayGuestBookingClient'
import FlightOfferBookingClient from '@/components/flights/FlightOfferBookingClient'

const stripeMocks = vi.hoisted(() => ({
  confirmPayment: vi.fn(),
  getStripe: vi.fn(() => Promise.resolve(null)),
  loadStripe: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment: stripeMocks.confirmPayment }),
  useElements: () => ({ mounted: true }),
}))

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: stripeMocks.loadStripe,
}))

vi.mock('@/lib/stripe/client', () => ({
  getStripe: stripeMocks.getStripe,
}))

function mockJsonResponse(body: unknown, init: ResponseInit = {}) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  }))
}

function requestBody(call: unknown[]) {
  const init = call[1] as RequestInit
  return JSON.parse(String(init.body))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StayGuestBookingClient', () => {
  const stayProps = {
    hotelId: 'hotel-123',
    hotelName: 'Goldwynn Resort',
    rateId: 'rate-abc',
    checkin: '2026-08-01',
    checkout: '2026-08-04',
    adults: 2,
    roomName: 'Ocean King',
    amountCents: 126000,
    currency: 'USD',
    trips: [{ id: 'trip-1', name: 'Summer Bahamas' }],
  }

  test('disables checkout when the user has no trips to attach the stay to', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<StayGuestBookingClient {...stayProps} trips={[]} />)

    expect(screen.getByRole('button', { name: /continue to pay/i })).toBeDisabled()
    expect(screen.getByRole('option', { name: 'No trips found' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('adds stay to trip, prebooks LiteAPI rate, and creates payment intent before Stripe payment', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/trips/trip-1/items') return mockJsonResponse({ tripItemId: 'stay-item-1' })
      if (url === '/api/booking/hotels/prebook') return mockJsonResponse({ prebookId: 'prebook-1' })
      if (url === '/api/booking/payments/intent') return mockJsonResponse({ paymentIntentId: 'pi_1', clientSecret: 'cs_1' })
      return mockJsonResponse({ error: `Unhandled ${url}` }, { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<StayGuestBookingClient {...stayProps} />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'traveler@example.com' } })
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Valdez' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Williams' } })
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '+12425551212' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to pay/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Pay and confirm hotel' })).toBeInTheDocument())

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/trips/trip-1/items')
    expect(requestBody(fetchMock.mock.calls[0])).toMatchObject({
      itemType: 'hotel',
      sourceType: 'web_stay_booking',
      provider: 'liteapi',
      providerHotelId: 'hotel-123',
      providerRateId: 'rate-abc',
      name: 'Goldwynn Resort',
      date: '2026-08-01',
      endDate: '2026-08-04',
      price: 1260,
      currency: 'USD',
      guests: 2,
    })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/booking/hotels/prebook')
    expect(requestBody(fetchMock.mock.calls[1])).toMatchObject({
      rateId: 'rate-abc',
      hotelId: 'hotel-123',
      checkin: '2026-08-01',
      checkout: '2026-08-04',
      currency: 'USD',
    })
    expect(fetchMock.mock.calls[2][0]).toBe('/api/booking/payments/intent')
    expect(requestBody(fetchMock.mock.calls[2])).toMatchObject({
      amount: 126000,
      tripId: 'trip-1',
      bookingType: 'hotel',
      currency: 'usd',
      metadata: {
        source_surface: 'web',
        provider: 'liteapi',
        hotel_id: 'hotel-123',
        rate_id: 'rate-abc',
      },
    })
  })
})

describe('FlightOfferBookingClient', () => {
  test('verifies fare on load and disables checkout when no trips exist', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/booking/flights/verify') {
        return mockJsonResponse({ offer_id: 'offer-123', price: 345, currency: 'USD' })
      }
      return mockJsonResponse({ error: `Unhandled ${url}` }, { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightOfferBookingClient offerId="offer-123" trips={[]} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /continue to pay/i })).toBeDisabled())
    expect(screen.getByRole('option', { name: 'No trips found' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/booking/flights/verify')
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({ offerId: 'offer-123' })
  })

  test('adds flight to trip and starts LiteAPI prebook with traveler/passport details', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/booking/flights/verify') {
        return mockJsonResponse({
          offer_id: 'offer-123',
          origin: 'MIA',
          destination: 'NAS',
          airline: 'Bahamasair',
          departure_at: '2026-08-01T10:00:00Z',
          arrival_at: '2026-08-01T11:00:00Z',
          price: 345,
          currency: 'USD',
        })
      }
      if (url === '/api/trips/trip-1/items') return mockJsonResponse({ tripItemId: 'flight-item-1' })
      if (url === '/api/booking/flights/prebook') {
        return mockJsonResponse({
          prebook_id: 'flight-prebook-1',
          transaction_id: 'txn-1',
          client_secret: 'cs_flight_1',
          publishable_key: 'pk_test_1',
        })
      }
      return mockJsonResponse({ error: `Unhandled ${url}` }, { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightOfferBookingClient offerId="offer-123" trips={[{ id: 'trip-1', name: 'Summer Bahamas' }]} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /continue to pay/i })).toBeEnabled())

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'traveler@example.com' } })
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Valdez' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Williams' } })
    fireEvent.change(screen.getByLabelText(/phone country code/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '2425551212' } })
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1988-02-02' } })
    fireEvent.change(screen.getByLabelText(/nationality/i), { target: { value: 'bs' } })
    fireEvent.change(screen.getByLabelText(/passport number/i), { target: { value: 'A1234567' } })
    fireEvent.change(screen.getByLabelText(/passport issue country/i), { target: { value: 'bs' } })
    fireEvent.change(screen.getByLabelText(/passport expiry/i), { target: { value: '2031-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to pay/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Pay and confirm flight' })).toBeInTheDocument())

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/trips/trip-1/items')
    expect(requestBody(fetchMock.mock.calls[1])).toMatchObject({
      itemType: 'flight',
      sourceType: 'web_flight_booking',
      provider: 'liteapi',
      providerOfferId: 'offer-123',
      origin: 'MIA',
      destination: 'NAS',
      airline: 'Bahamasair',
      price: 345,
      currency: 'USD',
    })
    expect(fetchMock.mock.calls[2][0]).toBe('/api/booking/flights/prebook')
    expect(requestBody(fetchMock.mock.calls[2])).toMatchObject({
      offerId: 'offer-123',
      contact: {
        firstName: 'Valdez',
        lastName: 'Williams',
        email: 'traveler@example.com',
        phoneCountryCode: '1',
        phoneNumber: '2425551212',
      },
      passengers: [{
        firstName: 'Valdez',
        lastName: 'Williams',
        birthday: '1988-02-02',
        gender: 'M',
        nationality: 'BS',
        documentType: 'passport',
        documentNumber: 'A1234567',
        documentIssueCountry: 'BS',
        documentExpiry: '2031-01-01',
      }],
    })
    expect(stripeMocks.loadStripe).toHaveBeenCalledWith('pk_test_1')
  })
})
