import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import StayGuestBookingClient from '@/components/stays/StayGuestBookingClient'
import FlightBookingConfirmationClient from '@/components/flights/FlightBookingConfirmationClient'
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

function mockWindowLocation() {
  const originalLocation = window.location
  const location = { href: '' } as Location
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: location,
  })
  return () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  }
}

const basicFlightSummary = {
  route: 'MIA to NAS',
  airline: 'Bahamasair',
  airlineCode: 'UP',
  departure: '10:00 AM',
  arrival: '11:00 AM',
  duration: '1h',
  stops: 'Direct',
  price: 345,
  currency: 'USD',
  passengers: 1,
  cabinClass: 'Economy',
  fareBrand: 'Main Cabin',
  refundable: false,
  carryOn: true,
  checkedBags: 1,
}

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

    const continueButton = screen.getByRole('button', { name: /continue to pay/i })
    expect(continueButton).toBeDisabled()
    expect(continueButton).toHaveClass('bg-brand-600')
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

    const continueButton = screen.getByRole('button', { name: /continue to pay/i })
    expect(continueButton).toHaveClass('bg-brand-600')
    expect(continueButton.querySelector('.bg-gold-400')).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'traveler@example.com' } })
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Valdez' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Williams' } })
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '+12425551212' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to pay/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Pay and confirm hotel' })).toBeInTheDocument())
    const payButton = screen.getByRole('button', { name: 'Pay and confirm hotel' })
    expect(payButton).toHaveClass('bg-brand-600')
    expect(payButton.querySelector('.bg-gold-400')).toBeTruthy()

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
  test('shows a trip-required state without calling the provider when no trips exist', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightOfferBookingClient offerId="offer-123" trips={[]} />)

    expect(screen.getByRole('heading', { name: /create a trip before booking this fare/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create trip' })).toHaveAttribute(
      'href',
      '/dashboard/trips/new?returnTo=%2Fflights%2Foffer-123%2Fbook&source=flight',
    )
    expect(screen.getByRole('link', { name: 'Create trip' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Create trip' }).querySelector('.bg-gold-400')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to flights' })).toHaveAttribute('href', '/flights')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('blocks bare flight offer links until the traveler selects a current fare', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<FlightOfferBookingClient offerId="offer-123" trips={[{ id: 'trip-1', name: 'Summer Bahamas' }]} />)

    expect(screen.getByRole('heading', { name: /search again before booking this fare/i })).toBeInTheDocument()
    expect(screen.getByText('Live fare details are missing from this link.')).toBeInTheDocument()
    expect(screen.getByText(/this link does not include the selected fare details/i)).toBeInTheDocument()
    expect(screen.getByText('Search again')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Search current fares' })).toHaveAttribute('href', '/flights')
    expect(screen.getByRole('link', { name: 'Search current fares' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Search current fares' }).querySelector('.bg-gold-400')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /verify fare and continue/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('renders selected fare context before collecting traveler details', () => {
    render(
      <FlightOfferBookingClient
        offerId="offer-123"
        trips={[{ id: 'trip-1', name: 'Summer Bahamas' }]}
        summary={{
          route: 'MIA to NAS',
          airline: 'Bahamasair',
          airlineCode: 'UP',
          departure: '10:00 AM',
          arrival: '11:00 AM',
          duration: '1h',
          stops: 'Direct',
          price: 345,
          currency: 'USD',
          passengers: 2,
          cabinClass: 'Economy',
          fareBrand: 'Main Cabin',
          refundable: true,
          carryOn: true,
          checkedBags: 1,
        }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Bahamasair (UP)' })).toBeInTheDocument()
    expect(screen.getByText('$345.00')).toBeInTheDocument()
    expect(screen.getAllByText('MIA to NAS').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('10:00 AM')).toBeInTheDocument()
    expect(screen.getByText('11:00 AM')).toBeInTheDocument()
    expect(screen.getByText('1h')).toBeInTheDocument()
    expect(screen.getByText('Direct')).toBeInTheDocument()
    expect(screen.getAllByText('Main Cabin').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Carry-on + 1 checked')).toBeInTheDocument()
    expect(screen.getByText('Refundable')).toBeInTheDocument()
    expect(screen.getByText('2 travelers')).toBeInTheDocument()

    const statusRail = screen.getByRole('complementary', { name: 'Flight checkout status' })
    expect(within(statusRail).getByRole('heading', { name: 'Traveler details' })).toBeInTheDocument()
    expect(within(statusRail).getByText('Live search result attached')).toBeInTheDocument()
    expect(within(statusRail).getByText('Ready to save into My Trip')).toBeInTheDocument()
    expect(within(statusRail).getByText(/Confirmed only after payment, provider booking, local booking, and trip item reconcile/i)).toBeInTheDocument()
    expect(within(statusRail).getByText('Fare snapshot')).toBeInTheDocument()
  })

  test('starts LiteAPI prebook with traveler/passport details, then saves the flight to the trip', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/trips/trip-1/items') return mockJsonResponse({ tripItemId: 'flight-item-1' })
      if (url === '/api/booking/flights/prebook') {
        return mockJsonResponse({
          prebook_id: 'flight-prebook-1',
          transaction_id: 'txn-1',
          client_secret: 'cs_flight_1',
          publishable_key: 'pk_test_1',
          origin: 'MIA',
          destination: 'NAS',
          airline: 'Bahamasair',
          departure_at: '2026-08-01T10:00:00Z',
          arrival_at: '2026-08-01T11:00:00Z',
          price: 345,
          currency: 'USD',
        })
      }
      return mockJsonResponse({ error: `Unhandled ${url}` }, { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <FlightOfferBookingClient
        offerId="offer-123"
        trips={[{ id: 'trip-1', name: 'Summer Bahamas' }]}
        summary={basicFlightSummary}
      />,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: /verify fare and continue/i })).toBeEnabled())
    const verifyButton = screen.getByRole('button', { name: /verify fare and continue/i })
    expect(verifyButton).toHaveClass('bg-brand-600')
    expect(verifyButton.querySelector('.bg-gold-400')).toBeTruthy()

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
    fireEvent.click(screen.getByRole('button', { name: /verify fare and continue/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Pay and confirm flight' })).toBeInTheDocument())
    const payButton = screen.getByRole('button', { name: 'Pay and confirm flight' })
    expect(payButton).toHaveClass('bg-brand-600')
    expect(payButton.querySelector('.bg-gold-400')).toBeTruthy()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/booking/flights/prebook')
    expect(requestBody(fetchMock.mock.calls[0])).toMatchObject({
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
    expect(stripeMocks.loadStripe).toHaveBeenCalledWith('pk_test_1')
  })

  test('collects one passport profile per selected flight traveler', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/trips/trip-1/items') return mockJsonResponse({ tripItemId: 'flight-item-1' })
      if (url === '/api/booking/flights/prebook') {
        return mockJsonResponse({
          prebook_id: 'flight-prebook-1',
          transaction_id: 'txn-1',
          client_secret: 'cs_flight_1',
          publishable_key: 'pk_test_1',
          price: 690,
          currency: 'USD',
        })
      }
      return mockJsonResponse({ error: `Unhandled ${url}` }, { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <FlightOfferBookingClient
        offerId="offer-123"
        trips={[{ id: 'trip-1', name: 'Summer Bahamas' }]}
        summary={{
          route: 'MIA to NAS',
          airline: 'Bahamasair',
          passengers: 2,
          price: 690,
          currency: 'USD',
        }}
      />,
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'lead@example.com' } })
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '2425551212' } })
    fireEvent.change(screen.getByLabelText('Traveler 1 first name'), { target: { value: 'Valdez' } })
    fireEvent.change(screen.getByLabelText('Traveler 1 last name'), { target: { value: 'Williams' } })
    fireEvent.change(screen.getByLabelText('Traveler 1 date of birth'), { target: { value: '1988-02-02' } })
    fireEvent.change(screen.getByLabelText('Traveler 1 nationality'), { target: { value: 'bs' } })
    fireEvent.change(screen.getByLabelText('Traveler 1 passport number'), { target: { value: 'A1234567' } })
    fireEvent.change(screen.getByLabelText('Traveler 1 passport issue country'), { target: { value: 'bs' } })
    fireEvent.change(screen.getByLabelText('Traveler 1 passport expiry'), { target: { value: '2031-01-01' } })
    fireEvent.change(screen.getByLabelText('Traveler 2 first name'), { target: { value: 'Avery' } })
    fireEvent.change(screen.getByLabelText('Traveler 2 last name'), { target: { value: 'Williams' } })
    fireEvent.change(screen.getByLabelText('Traveler 2 date of birth'), { target: { value: '1990-05-03' } })
    fireEvent.change(screen.getByLabelText('Traveler 2 gender'), { target: { value: 'F' } })
    fireEvent.change(screen.getByLabelText('Traveler 2 nationality'), { target: { value: 'us' } })
    fireEvent.change(screen.getByLabelText('Traveler 2 passport number'), { target: { value: 'B7654321' } })
    fireEvent.change(screen.getByLabelText('Traveler 2 passport issue country'), { target: { value: 'us' } })
    fireEvent.change(screen.getByLabelText('Traveler 2 passport expiry'), { target: { value: '2032-04-01' } })
    fireEvent.click(screen.getByRole('button', { name: /verify fare and continue/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Pay and confirm flight' })).toBeInTheDocument())

    expect(requestBody(fetchMock.mock.calls[0])).toMatchObject({
      contact: {
        firstName: 'Valdez',
        lastName: 'Williams',
        email: 'lead@example.com',
        phoneCountryCode: '1',
        phoneNumber: '2425551212',
      },
      passengers: [
        {
          firstName: 'Valdez',
          lastName: 'Williams',
          birthday: '1988-02-02',
          gender: 'M',
          nationality: 'BS',
          documentNumber: 'A1234567',
          documentIssueCountry: 'BS',
          documentExpiry: '2031-01-01',
        },
        {
          firstName: 'Avery',
          lastName: 'Williams',
          birthday: '1990-05-03',
          gender: 'F',
          nationality: 'US',
          documentNumber: 'B7654321',
          documentIssueCountry: 'US',
          documentExpiry: '2032-04-01',
        },
      ],
    })
  })

  test('shows a friendly expired-fare message when provider prebook returns a raw 400', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/booking/flights/prebook') {
        return mockJsonResponse({ error: 'Provider request failed with status 400.' }, { status: 400 })
      }
      return mockJsonResponse({ error: `Unhandled ${url}` }, { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <FlightOfferBookingClient
        offerId="offer-123"
        trips={[{ id: 'trip-1', name: 'Summer Bahamas' }]}
        summary={basicFlightSummary}
      />,
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'traveler@example.com' } })
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Valdez' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Williams' } })
    fireEvent.change(screen.getByLabelText(/phone country code/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '2425551212' } })
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1988-02-02' } })
    fireEvent.change(screen.getByLabelText(/passport number/i), { target: { value: 'A1234567' } })
    fireEvent.change(screen.getByLabelText(/passport expiry/i), { target: { value: '2031-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: /verify fare and continue/i }))

    expect(await screen.findByText(/This fare could not be verified/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('redirects successful payment to the flight confirmation route', async () => {
    const restoreLocation = mockWindowLocation()
    stripeMocks.confirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_flight_1', status: 'succeeded' },
    })
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/booking/flights/prebook') {
        return mockJsonResponse({
          prebook_id: 'flight-prebook-1',
          transaction_id: 'txn-1',
          client_secret: 'cs_flight_1',
          publishable_key: 'pk_test_1',
          price: 345,
          currency: 'USD',
        })
      }
      if (url === '/api/trips/trip-1/items') return mockJsonResponse({ tripItemId: 'flight-item-1' })
      if (url === '/api/booking/flights/book') {
        return mockJsonResponse({
          bookingRecordId: 'booking-1',
          bookingId: 'provider-booking-1',
        })
      }
      return mockJsonResponse({ error: `Unhandled ${url}` }, { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    try {
      render(
        <FlightOfferBookingClient
          offerId="offer-123"
          trips={[{ id: 'trip-1', name: 'Summer Bahamas' }]}
          summary={basicFlightSummary}
        />,
      )

      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'traveler@example.com' } })
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Valdez' } })
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Williams' } })
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '2425551212' } })
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1988-02-02' } })
      fireEvent.change(screen.getByLabelText(/passport number/i), { target: { value: 'A1234567' } })
      fireEvent.change(screen.getByLabelText(/passport expiry/i), { target: { value: '2031-01-01' } })
      fireEvent.click(screen.getByRole('button', { name: /verify fare and continue/i }))

      const payButton = await screen.findByRole('button', { name: 'Pay and confirm flight' })
      fireEvent.click(payButton)

      await waitFor(() => expect(window.location.href).toBe('/flights/offer-123/confirmation?tripId=trip-1&bookingId=booking-1'))
      expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/api/booking/flights/book')
      expect(requestBody(fetchMock.mock.calls.at(-1) ?? [])).toMatchObject({
        offerId: 'offer-123',
        prebookId: 'flight-prebook-1',
        transactionId: 'txn-1',
        tripId: 'trip-1',
        paymentIntentId: 'pi_flight_1',
      })
    } finally {
      restoreLocation()
    }
  })
})

describe('FlightBookingConfirmationClient', () => {
  test.each([
    ['confirmed' as const, 'Flight booking confirmed', 'DEMO123'],
    ['pending' as const, 'Payment received, booking pending', 'Pending'],
    ['provider_failed' as const, 'Payment received, provider booking failed', 'Pending'],
  ])('renders demo %s booking state without loading the booking API', async (demoState, heading, providerReference) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(
      <FlightBookingConfirmationClient
        offerId="demo-offer"
        tripId="demo-trip"
        bookingId={`demo-${demoState}`}
        demoState={demoState}
      />,
    )

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.getByText('Non-payment fixture')).toBeInTheDocument()
    expect(screen.getAllByText(providerReference).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('shows confirmed copy only when booking return is reconciled', async () => {
    const fetchMock = vi.fn(() => mockJsonResponse({
      tripId: 'trip-1',
      tripItemId: 'flight-item-1',
      bookingId: 'booking-1',
      provider: 'flight_liteapi',
      providerReference: 'PNR123',
      paymentStatus: 'paid',
      providerStatus: 'confirmed',
      amount: 345,
      currency: 'usd',
      sourceSurface: 'web',
      reconciled: true,
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(
      <FlightBookingConfirmationClient
        offerId="offer-123"
        tripId="trip-1"
        bookingId="booking-1"
      />,
    )

    expect(await screen.findByRole('heading', { name: 'Flight booking confirmed' })).toBeInTheDocument()
    expect(screen.getByText('Your payment, provider booking, local booking record, and trip item are reconciled.')).toBeInTheDocument()
    expect(screen.getByText('LiteAPI flights')).toBeInTheDocument()
    expect(screen.getByText('$345')).toBeInTheDocument()
    expect(screen.getByText('Confirmation rule')).toBeInTheDocument()
    expect(screen.getByText('Payment: paid')).toBeInTheDocument()
    expect(screen.getByText('Provider: confirmed')).toBeInTheDocument()
    expect(screen.getByText('Trip record: Reconciled')).toBeInTheDocument()
    expect(screen.getByText('Support context')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/trips/trip-1/bookings/booking-1', { cache: 'no-store' })
    expect(screen.getByRole('link', { name: 'View trip' })).toHaveAttribute('href', '/trip/trip-1?booking=booking-1')
    expect(screen.getByRole('link', { name: 'View trip' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Open trip review' })).toHaveAttribute('href', '/trip/trip-1?booking=booking-1')
    expect(container.querySelector('main')).toHaveClass('bg-white')
    expect(container.innerHTML).not.toMatch(/rounded-\[2rem\]|bg-night/)
  })

  test('does not mark paid but provider-pending flights as confirmed', async () => {
    const fetchMock = vi.fn(() => mockJsonResponse({
      tripId: 'trip-1',
      tripItemId: 'flight-item-1',
      bookingId: 'booking-1',
      provider: 'flight_liteapi',
      providerReference: null,
      paymentStatus: 'paid',
      providerStatus: 'pending',
      amount: 345,
      currency: 'usd',
      sourceSurface: 'web',
      reconciled: false,
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <FlightBookingConfirmationClient
        offerId="offer-123"
        tripId="trip-1"
        bookingId="booking-1"
      />,
    )

    expect(await screen.findByRole('heading', { name: 'Payment received, booking pending' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Flight booking confirmed' })).not.toBeInTheDocument()
    expect(screen.getByText('Trip record: Needs review')).toBeInTheDocument()
    expect(screen.getByText('Do not duplicate the booking yet.')).toBeInTheDocument()
  })

  test('shortens long provider offer identifiers on the confirmation card', async () => {
    const longOfferId = 'h6NwaWTZJDAxOWVkZTMyLTZlN2MtNzczNS1hMWFhLTlkYTJmZTU1YTcwMaJ0cMtAeCTMzMzMzaJtdctAJAAAAAAAAKJtZMsAAAAAAAAAAKNjdXKjVVNEo3VpZM4ABbmJoWyShKFvo01JQaJkZaNOQVOiZGGqMjAyNi0wNy0wM6JkaahPVVRCT1VORIShb6NOQVOiZGWjTUlBomRhqjIwMjYtMDctMDiiZGmnSU5CT1VORA=='
    const fetchMock = vi.fn(() => mockJsonResponse({
      tripId: 'trip-1',
      tripItemId: 'flight-item-1',
      bookingId: 'booking-1',
      provider: 'flight_liteapi',
      providerReference: null,
      paymentStatus: 'paid',
      providerStatus: 'pending',
      amount: 345,
      currency: 'usd',
      sourceSurface: 'web',
      reconciled: false,
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <FlightBookingConfirmationClient
        offerId={longOfferId}
        tripId="trip-1"
        bookingId="booking-1"
      />,
    )

    expect(await screen.findByText(/h6NwaWTZJD/)).toBeInTheDocument()
    expect(screen.getByTitle(longOfferId)).toBeInTheDocument()
    expect(screen.queryByText(longOfferId)).not.toBeInTheDocument()
  })
})
