import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  callTravelProvider: vi.fn(),
  getProviderErrorResponse: vi.fn((error: unknown) => ({
    error: error instanceof Error ? error.message : 'Provider request failed.',
    details: null,
    status: 500,
  })),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/travel-booking/provider', () => ({
  callTravelProvider: mocks.callTravelProvider,
  getProviderErrorResponse: mocks.getProviderErrorResponse,
}))

import { POST as addTripItem } from '@/app/api/trips/[id]/items/route'
import { GET as getBookingReturn } from '@/app/api/trips/[id]/bookings/[bookingId]/route'
import { POST as hotelRates } from '@/app/api/booking/hotels/rates/route'
import { POST as hotelPrebook } from '@/app/api/booking/hotels/prebook/route'
import { POST as hotelBook } from '@/app/api/booking/hotels/book/route'
import { POST as flightVerify } from '@/app/api/booking/flights/verify/route'
import { POST as flightPrebook } from '@/app/api/booking/flights/prebook/route'
import { POST as flightBook } from '@/app/api/booking/flights/book/route'

type User = { id: string } | null
type JsonRecord = Record<string, unknown>

function jsonRequest(body: JsonRecord): Request {
  return new Request('http://localhost.test/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function clientWithAuth(user: User, from = vi.fn()) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from,
  }
}

function selectMaybeSingle(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  }
  return query
}

function insertSingle(table: string, inserted: Array<{ table: string; row: JsonRecord }>, data: JsonRecord) {
  return {
    insert: vi.fn((row: JsonRecord) => {
      inserted.push({ table, row })
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data, error: null }),
        })),
      }
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createAdminClient.mockReturnValue(null)
})

describe('direct trip item API', () => {
  test('requires auth before mutating a trip', async () => {
    mocks.createClient.mockResolvedValue(clientWithAuth(null))

    const response = await addTripItem(
      jsonRequest({ itemType: 'hotel', name: 'Goldwynn Resort' }),
      { params: { id: 'trip-1' } },
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Authentication is required to add items to a trip.',
    })
  })

  test('adds a hotel directly to canonical trip accommodations', async () => {
    const inserted: Array<{ table: string; row: JsonRecord }> = []
    const from = vi.fn((table: string) => {
      if (table === 'trips') return selectMaybeSingle({ id: 'trip-1' })
      if (table === 'trip_accommodations') {
        return insertSingle(table, inserted, { id: 'stay-item-1', status: 'planned' })
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    mocks.createClient.mockResolvedValue(clientWithAuth({ id: 'user-1' }, from))

    const response = await addTripItem(
      jsonRequest({
        itemType: 'stay',
        sourceId: 'hotel-123',
        name: 'Goldwynn Resort',
        island: 'New Providence',
        date: '2026-08-01',
        endDate: '2026-08-04',
        providerHotelId: 'lite-hotel-123',
        providerRateId: 'rate-abc',
        price: 1200,
        currency: 'bsd',
        imageUrl: 'https://images.example/goldwynn.jpg',
      }),
      { params: { id: 'trip-1' } },
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      tripId: 'trip-1',
      tripItemId: 'stay-item-1',
      itemType: 'accommodation',
      status: 'planned',
    })
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({
      table: 'trip_accommodations',
      row: {
        trip_id: 'trip-1',
        name: 'Goldwynn Resort',
        liteapi_hotel_id: 'lite-hotel-123',
        liteapi_rate_id: 'rate-abc',
        total_price: 1200,
        currency: 'BSD',
        nights: 3,
        status: 'planned',
      },
    })
  })
})

describe('hotel booking APIs', () => {
  test('keeps rate lookup browsable and normalizes LiteAPI rooms', async () => {
    mocks.callTravelProvider.mockResolvedValue({
      status: 200,
      data: {
        data: [{
          hotelId: 'hotel-123',
          currency: 'USD',
          roomTypes: [{
            roomTypeId: 'room-1',
            name: 'Ocean King',
            offerId: 'rate-abc',
            offerRetailRate: { amount: 420, currency: 'USD' },
            rates: [{
              name: 'Ocean King',
              maxOccupancy: 2,
              boardType: 'RO',
              cancellationPolicies: {
                refundableTag: 'RFN',
                cancelPolicyInfos: [{ amount: 0, currency: 'USD', cancelTime: '2026-07-25T00:00:00Z' }],
              },
            }],
          }],
        }],
      },
    })

    const response = await hotelRates(jsonRequest({
      hotelIds: ['hotel-123'],
      checkin: '2026-08-01',
      checkout: '2026-08-04',
      adults: 2,
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.callTravelProvider).toHaveBeenCalledWith('/hotels/rates', {
      hotelIds: ['hotel-123'],
      checkin: '2026-08-01',
      checkout: '2026-08-04',
      occupancies: [{ adults: 2 }],
      currency: 'USD',
      guestNationality: 'US',
    })
    expect(body).toMatchObject({
      checkin: '2026-08-01',
      checkout: '2026-08-04',
      nights: 3,
      rates: [{
        hotel_id: 'hotel-123',
        cheapest_total: 420,
        rooms: [{
          rate_id: 'rate-abc',
          total_price: 420,
          refundable: true,
        }],
      }],
    })
  })

  test('requires auth before hotel prebook and calls LiteAPI book base', async () => {
    mocks.createClient.mockResolvedValue(clientWithAuth(null))

    const unauthorized = await hotelPrebook(jsonRequest({ rateId: 'rate-abc' }))
    expect(unauthorized.status).toBe(401)

    mocks.createClient.mockResolvedValue(clientWithAuth({ id: 'user-1' }))
    mocks.callTravelProvider.mockResolvedValue({
      status: 200,
      data: { data: { prebookId: 'prebook-1', offerId: 'rate-abc', currency: 'USD' } },
    })

    const response = await hotelPrebook(jsonRequest({ rateId: 'rate-abc' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.callTravelProvider).toHaveBeenCalledWith('/rates/prebook', {
      offerId: 'rate-abc',
      usePaymentSdk: false,
    }, { useBookBase: true })
    expect(body).toMatchObject({ prebookId: 'prebook-1', offerId: 'rate-abc', currency: 'USD' })
  })

  test('requires auth before hotel provider booking', async () => {
    mocks.createClient.mockResolvedValue(clientWithAuth(null))

    const response = await hotelBook(jsonRequest({ tripId: 'trip-1' }))

    expect(response.status).toBe(401)
    expect(mocks.callTravelProvider).not.toHaveBeenCalled()
  })
})

describe('flight booking APIs', () => {
  test('verifies LiteAPI fares and surfaces price changes', async () => {
    mocks.callTravelProvider.mockResolvedValue({
      status: 200,
      data: {
        data: [{
          offerId: 'offer-123',
          pricing: { display: { total: '345.50', currency: 'USD' } },
          changes: { priceChanged: true, previousPrice: 320, messages: ['Fare changed'] },
          journey: {
            segments: [{
              departure: { iataCode: 'MIA' },
              arrival: { iataCode: 'NAS' },
              airlineName: 'Bahamasair',
              departureTime: '2026-08-01T10:00:00Z',
              arrivalTime: '2026-08-01T11:00:00Z',
            }],
          },
        }],
      },
    })

    const response = await flightVerify(jsonRequest({ offerId: 'offer-123' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.callTravelProvider).toHaveBeenCalledWith('/flights/verify', { offerId: 'offer-123' })
    expect(body).toMatchObject({
      offer_id: 'offer-123',
      origin: 'MIA',
      destination: 'NAS',
      airline: 'Bahamasair',
      price: 345.5,
      currency: 'USD',
      price_changed: true,
      previous_price: 320,
      change_messages: ['Fare changed'],
    })
  })

  test('requires auth before flight prebook and sends payment SDK payload', async () => {
    mocks.createClient.mockResolvedValue(clientWithAuth(null))

    const unauthorized = await flightPrebook(jsonRequest({ offerId: 'offer-123' }))
    expect(unauthorized.status).toBe(401)

    mocks.createClient.mockResolvedValue(clientWithAuth({ id: 'user-1' }))
    mocks.callTravelProvider.mockResolvedValue({
      status: 200,
      data: {
        data: {
          prebookId: 'flight-prebook-1',
          price: { amount: 500, currency: 'USD' },
          payment: { transactionId: 'txn-1', clientSecret: 'secret-1', publishableKey: 'pk-1' },
        },
      },
    })

    const response = await flightPrebook(jsonRequest({ offerId: 'offer-123' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.callTravelProvider).toHaveBeenCalledWith('/flights/prebooks', {
      offerId: 'offer-123',
      usePaymentSdk: true,
    })
    expect(body).toMatchObject({
      prebook_id: 'flight-prebook-1',
      transaction_id: 'txn-1',
      client_secret: 'secret-1',
      publishable_key: 'pk-1',
      price: 500,
      currency: 'USD',
    })
  })

  test('requires auth before flight provider booking', async () => {
    mocks.createClient.mockResolvedValue(clientWithAuth(null))

    const response = await flightBook(jsonRequest({ tripId: 'trip-1' }))

    expect(response.status).toBe(401)
    expect(mocks.callTravelProvider).not.toHaveBeenCalled()
  })
})

describe('booking return API', () => {
  test('only reports reconciled when payment, provider reference, and trip item align', async () => {
    const booking = {
      id: 'booking-1',
      trip_id: 'trip-1',
      user_id: 'user-1',
      booking_type: 'accommodation',
      type: 'hotel',
      provider: 'liteapi',
      status: 'confirmed',
      amount: 1200,
      currency: 'usd',
      paid_at: '2026-06-17T10:00:00Z',
      stripe_payment_intent_id: 'pi_123',
      booking_ref: 'lite-booking-1',
      booking_reference: 'hotel-confirmation-1',
      external_reference: 'hotel-confirmation-1',
      financial_metadata: { source_surface: 'web', provider_status: 'CONFIRMED' },
      raw_response: {},
    }
    const from = vi.fn((table: string) => {
      if (table === 'trips') return selectMaybeSingle({ id: 'trip-1' })
      if (table === 'bookings') return selectMaybeSingle(booking)
      if (table === 'trip_accommodations') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn().mockResolvedValue({
            data: [{ id: 'stay-item-1', status: 'booked', booking_reference: 'hotel-confirmation-1' }],
            error: null,
          }),
        }
        return query
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    mocks.createClient.mockResolvedValue(clientWithAuth({ id: 'user-1' }, from))

    const response = await getBookingReturn(
      new Request('http://localhost.test/api'),
      { params: { id: 'trip-1', bookingId: 'booking-1' } },
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      tripId: 'trip-1',
      tripItemId: 'stay-item-1',
      bookingId: 'booking-1',
      provider: 'hotel_liteapi',
      providerReference: 'hotel-confirmation-1',
      paymentStatus: 'paid',
      providerStatus: 'confirmed',
      amount: 1200,
      currency: 'usd',
      sourceSurface: 'web',
      reconciled: true,
    })
  })
})
