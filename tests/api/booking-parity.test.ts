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
import { POST as attachFlightServices } from '@/app/api/booking/flights/prebook/[prebookId]/services/route'
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

function adminPersistenceMock(options: {
  existingBookingId?: string | null
  insertedBookingId?: string
  insertedTripItemId?: string
  updatedTripItemId?: string | null
  bookingInsertError?: string
  bookingUpdateError?: string
  tripItemInsertError?: string
  tripItemUpdateError?: string
}) {
  const inserted: Array<{ table: string; row: JsonRecord }> = []
  const updated: Array<{ table: string; row: JsonRecord; filters: Array<[string, unknown]> }> = []

  const from = vi.fn((table: string) => {
    if (table === 'bookings') {
      const bookingQuery = {
        select: vi.fn(() => bookingQuery),
        eq: vi.fn(() => bookingQuery),
        maybeSingle: vi.fn().mockResolvedValue({
          data: options.existingBookingId ? { id: options.existingBookingId } : null,
          error: null,
        }),
        update: vi.fn((row: JsonRecord) => ({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: options.bookingUpdateError ? { message: options.bookingUpdateError } : null,
          }),
        })),
        insert: vi.fn((row: JsonRecord) => {
          inserted.push({ table, row })
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: options.bookingInsertError ? null : { id: options.insertedBookingId ?? 'booking-row-1' },
                error: options.bookingInsertError ? { message: options.bookingInsertError } : null,
              }),
            })),
          }
        }),
      }
      return bookingQuery
    }

    if (table === 'trip_accommodations' || table === 'trip_flights') {
      const filters: Array<[string, unknown]> = []
      const tripItemQuery = {
        update: vi.fn((row: JsonRecord) => {
          return {
            eq: vi.fn((column: string, value: unknown) => {
              filters.push([column, value])
              return {
                eq: vi.fn((nextColumn: string, nextValue: unknown) => {
                  filters.push([nextColumn, nextValue])
                  return {
                    select: vi.fn(() => ({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: options.updatedTripItemId && !options.tripItemUpdateError ? { id: options.updatedTripItemId } : null,
                        error: options.tripItemUpdateError ? { message: options.tripItemUpdateError } : null,
                      }),
                    })),
                  }
                }),
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: options.updatedTripItemId && !options.tripItemUpdateError ? { id: options.updatedTripItemId } : null,
                    error: options.tripItemUpdateError ? { message: options.tripItemUpdateError } : null,
                  }),
                })),
              }
            }),
          }
        }),
        insert: vi.fn((row: JsonRecord) => {
          inserted.push({ table, row })
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: options.tripItemInsertError ? null : { id: options.insertedTripItemId ?? `${table}-row-1` },
                error: options.tripItemInsertError ? { message: options.tripItemInsertError } : null,
              }),
            })),
          }
        }),
      }

      const originalUpdate = tripItemQuery.update
      tripItemQuery.update = vi.fn((row: JsonRecord) => {
        updated.push({ table, row, filters })
        return originalUpdate(row)
      }) as typeof tripItemQuery.update

      return tripItemQuery
    }

    if (table === 'travel_booking_records') {
      return {
        insert: vi.fn((row: JsonRecord) => {
          inserted.push({ table, row })
          return Promise.resolve({ data: null, error: null })
        }),
      }
    }

    throw new Error(`Unexpected admin table: ${table}`)
  })

  return { admin: { from }, inserted, updated, from }
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
            images: [{ url: 'https://static.cupid.travel/hotels/ocean-king-room.jpg' }],
            hotelImages: [{ url: 'https://static.cupid.travel/hotels/property-pool.jpg' }],
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
          image_urls: ['https://static.cupid.travel/hotels/ocean-king-room.jpg'],
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

  test('persists hotel provider booking into canonical booking, accommodation, and audit rows', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'trips') return selectMaybeSingle({ id: 'trip-1' })
      throw new Error(`Unexpected user table: ${table}`)
    })
    const persistence = adminPersistenceMock({
      insertedBookingId: 'booking-row-1',
      insertedTripItemId: 'stay-row-1',
    })
    mocks.createClient.mockResolvedValue(clientWithAuth({ id: 'user-1' }, from))
    mocks.createAdminClient.mockReturnValue(persistence.admin)
    mocks.callTravelProvider.mockResolvedValue({
      status: 200,
      data: {
        data: {
          bookingId: 'lite-booking-1',
          hotelConfirmationCode: 'hotel-confirmation-1',
          status: 'CONFIRMED',
          currency: 'USD',
          invoice: { totalAmount: 1260 },
          hotelId: 'hotel-123',
          hotel: { name: 'Goldwynn Resort' },
          checkin: '2026-08-01',
          checkout: '2026-08-04',
        },
      },
    })

    const response = await hotelBook(jsonRequest({
      tripId: 'trip-1',
      prebookId: 'prebook-1',
      paymentIntentId: 'pi_hotel_1',
      hotelId: 'hotel-123',
      rateId: 'rate-1',
      sourceId: 'place-123',
      hotelName: 'Goldwynn Resort',
      island: 'New Providence',
      checkin: '2026-08-01',
      checkout: '2026-08-04',
      amount: 1260,
      currency: 'USD',
      pricePerNight: 420,
      imageUrl: 'https://images.example/goldwynn.jpg',
      holder: {
        firstName: 'Valdez',
        lastName: 'Williams',
        email: 'traveler@example.com',
      },
      guests: [{
        firstName: 'Valdez',
        lastName: 'Williams',
        email: 'traveler@example.com',
      }],
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.callTravelProvider).toHaveBeenCalledWith('/rates/book', {
      prebookId: 'prebook-1',
      holder: {
        firstName: 'Valdez',
        lastName: 'Williams',
        email: 'traveler@example.com',
        phone: undefined,
      },
      guests: [{
        firstName: 'Valdez',
        lastName: 'Williams',
        email: 'traveler@example.com',
        phone: undefined,
        occupancyNumber: 1,
      }],
      payment: { method: 'ACC_CREDIT_CARD' },
    }, { useBookBase: true })
    expect(body).toMatchObject({
      bookingId: 'lite-booking-1',
      bookingRecordId: 'booking-row-1',
      tripId: 'trip-1',
      tripItemId: 'stay-row-1',
      provider: 'hotel_liteapi',
      providerReference: 'hotel-confirmation-1',
      paymentStatus: 'paid',
      providerStatus: 'confirmed',
      localStatus: 'saved',
      supportRequired: false,
      amount: 1260,
      currency: 'USD',
      sourceSurface: 'web',
    })

    expect(persistence.inserted).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: 'bookings',
        row: expect.objectContaining({
          user_id: 'user-1',
          trip_id: 'trip-1',
          booking_type: 'accommodation',
          provider: 'liteapi',
          booking_ref: 'lite-booking-1',
          booking_reference: 'hotel-confirmation-1',
          status: 'confirmed',
          amount: 1260,
          amount_cents: 126000,
          currency: 'usd',
          stripe_payment_intent_id: 'pi_hotel_1',
          financial_metadata: expect.objectContaining({
            source_surface: 'web',
            provider_status: 'CONFIRMED',
            prebook_id: 'prebook-1',
            hotel_id: 'hotel-123',
            guest_count: 1,
          }),
        }),
      }),
      expect.objectContaining({
        table: 'trip_accommodations',
        row: expect.objectContaining({
          trip_id: 'trip-1',
          place_id: 'place-123',
          name: 'Goldwynn Resort',
          booking_reference: 'hotel-confirmation-1',
          liteapi_hotel_id: 'hotel-123',
          liteapi_rate_id: 'rate-1',
          liteapi_prebook_id: 'prebook-1',
          stripe_payment_intent_id: 'pi_hotel_1',
          status: 'booked',
          total_price: 1260,
          currency: 'USD',
          nights: 3,
        }),
      }),
      expect.objectContaining({
        table: 'travel_booking_records',
        row: expect.objectContaining({
          user_id: 'user-1',
          product_type: 'hotel',
          status: 'confirmed',
          provider_booking_id: 'lite-booking-1',
          provider_booking_ref: 'hotel-confirmation-1',
          source: 'web',
          amount: 1260,
          currency: 'USD',
        }),
      }),
    ]))
  })

  test('surfaces hotel local-save failure after provider booking succeeds', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'trips') return selectMaybeSingle({ id: 'trip-1' })
      throw new Error(`Unexpected user table: ${table}`)
    })
    const persistence = adminPersistenceMock({
      insertedBookingId: 'booking-row-1',
      tripItemInsertError: 'trip accommodation insert failed',
    })
    mocks.createClient.mockResolvedValue(clientWithAuth({ id: 'user-1' }, from))
    mocks.createAdminClient.mockReturnValue(persistence.admin)
    mocks.callTravelProvider.mockResolvedValue({
      status: 200,
      data: {
        data: {
          bookingId: 'lite-booking-1',
          hotelConfirmationCode: 'hotel-confirmation-1',
          status: 'CONFIRMED',
          currency: 'USD',
          invoice: { totalAmount: 1260 },
          hotelId: 'hotel-123',
          checkin: '2026-08-01',
          checkout: '2026-08-04',
        },
      },
    })

    const response = await hotelBook(jsonRequest({
      tripId: 'trip-1',
      prebookId: 'prebook-1',
      paymentIntentId: 'pi_hotel_local_failed',
      hotelId: 'hotel-123',
      rateId: 'rate-1',
      hotelName: 'Goldwynn Resort',
      checkin: '2026-08-01',
      checkout: '2026-08-04',
      amount: 1260,
      currency: 'USD',
      holder: {
        firstName: 'Valdez',
        lastName: 'Williams',
        email: 'traveler@example.com',
      },
      guests: [{
        firstName: 'Valdez',
        lastName: 'Williams',
        email: 'traveler@example.com',
      }],
    }))
    const body = await response.json()

    expect(response.status).toBe(202)
    expect(body).toMatchObject({
      bookingId: 'lite-booking-1',
      bookingRecordId: 'booking-row-1',
      tripItemId: null,
      providerStatus: 'confirmed',
      paymentStatus: 'paid',
      localStatus: 'failed',
      supportRequired: true,
    })
    expect(body.localError).toContain('trip_accommodations insert failed')
    expect(body.localError).toContain('trip accommodation insert failed')
  })
})

describe('flight booking APIs', () => {
  test('keeps the old flight verify route as a safe prebook-redirect contract', async () => {
    const response = await flightVerify(jsonRequest({ offerId: 'offer-123' }))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(mocks.callTravelProvider).not.toHaveBeenCalled()
    expect(body).toMatchObject({
      error: 'LiteAPI flight fare verification happens during prebook.',
      nextStep: 'POST /api/booking/flights/prebook with traveler and passport details.',
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

  test('attaches selected seats and returns the provider replacement payment session', async () => {
    mocks.createClient.mockResolvedValue(clientWithAuth({ id: 'user-1' }))
    mocks.callTravelProvider.mockResolvedValue({
      status: 200,
      data: {
        data: [{
          prebookId: 'flight-prebook-1',
          price: { amount: 525, currency: 'USD' },
          payment: {
            transactionId: 'txn-with-seat',
            clientSecret: 'secret-with-seat',
            publishableKey: 'pk-1',
          },
        }],
      },
    })

    const response = await attachFlightServices(
      jsonRequest({
        selectedServices: [{ passengerIndex: 0, serviceId: 'seat-12a', quantity: 1 }],
      }),
      { params: { prebookId: 'flight-prebook-1' } },
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.callTravelProvider).toHaveBeenCalledWith(
      '/flights/prebooks/flight-prebook-1/services',
      { selectedServices: [{ passengerIndex: 0, serviceId: 'seat-12a', quantity: 1 }] },
    )
    expect(body).toMatchObject({
      prebook_id: 'flight-prebook-1',
      transaction_id: 'txn-with-seat',
      client_secret: 'secret-with-seat',
      publishable_key: 'pk-1',
      price: 525,
      currency: 'USD',
    })
  })

  test('requires auth before flight provider booking', async () => {
    mocks.createClient.mockResolvedValue(clientWithAuth(null))

    const response = await flightBook(jsonRequest({ tripId: 'trip-1' }))

    expect(response.status).toBe(401)
    expect(mocks.callTravelProvider).not.toHaveBeenCalled()
  })

  test('persists flight provider booking into canonical booking, flight, and audit rows', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'trips') return selectMaybeSingle({ id: 'trip-1' })
      throw new Error(`Unexpected user table: ${table}`)
    })
    const persistence = adminPersistenceMock({
      insertedBookingId: 'flight-booking-row-1',
      insertedTripItemId: 'flight-row-1',
    })
    mocks.createClient.mockResolvedValue(clientWithAuth({ id: 'user-1' }, from))
    mocks.createAdminClient.mockReturnValue(persistence.admin)
    mocks.callTravelProvider.mockResolvedValue({
      status: 200,
      data: {
        data: [{
          id: 'flight-booking-1',
          status: 'TICKETED',
          price: { amount: 540, currency: 'USD' },
          segments: [{
            departure: { iataCode: 'MIA' },
            arrival: { iataCode: 'NAS' },
            departureTime: '2026-08-01T13:00:00Z',
            arrivalTime: '2026-08-01T14:10:00Z',
            airlineName: 'Bahamasair',
          }],
        }],
      },
    })

    const response = await flightBook(jsonRequest({
      tripId: 'trip-1',
      offerId: 'offer-123',
      prebookId: 'flight-prebook-1',
      transactionId: 'txn-1',
      paymentIntentId: 'pi_flight_1',
      amount: 540,
      currency: 'USD',
      origin: 'MIA',
      destination: 'NAS',
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.callTravelProvider).toHaveBeenCalledWith('/flights/bookings', {
      prebookId: 'flight-prebook-1',
      transactionId: 'txn-1',
      payment: {
        method: 'TRANSACTION_ID',
        transactionId: 'txn-1',
      },
    })
    expect(body).toMatchObject({
      bookingId: 'flight-booking-1',
      bookingRecordId: 'flight-booking-row-1',
      tripId: 'trip-1',
      tripItemId: 'flight-row-1',
      provider: 'flight_liteapi',
      providerReference: 'flight-booking-1',
      paymentStatus: 'paid',
      providerStatus: 'confirmed',
      localStatus: 'saved',
      supportRequired: false,
      amount: 540,
      currency: 'USD',
      sourceSurface: 'web',
    })

    expect(persistence.inserted).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: 'bookings',
        row: expect.objectContaining({
          user_id: 'user-1',
          trip_id: 'trip-1',
          booking_type: 'flight',
          provider: 'liteapi',
          booking_ref: 'flight-booking-1',
          booking_reference: 'flight-booking-1',
          status: 'confirmed',
          amount: 540,
          amount_cents: 54000,
          currency: 'usd',
          supplier_ref: 'flight-booking-1',
          stripe_payment_intent_id: 'pi_flight_1',
          financial_metadata: expect.objectContaining({
            source_surface: 'web',
            provider_status: 'TICKETED',
            prebook_id: 'flight-prebook-1',
            transaction_id: 'txn-1',
            payment_intent_id: 'pi_flight_1',
            offer_id: 'offer-123',
          }),
        }),
      }),
      expect.objectContaining({
        table: 'trip_flights',
        row: expect.objectContaining({
          trip_id: 'trip-1',
          origin: 'MIA',
          destination: 'NAS',
          departure_at: '2026-08-01T13:00:00.000Z',
          arrival_at: '2026-08-01T14:10:00.000Z',
          airline: 'Bahamasair',
          booking_reference: 'flight-booking-1',
          price: 540,
          provider_offer_id: 'offer-123',
          stripe_payment_intent_id: 'pi_flight_1',
        }),
      }),
      expect.objectContaining({
        table: 'travel_booking_records',
        row: expect.objectContaining({
          user_id: 'user-1',
          product_type: 'flight',
          status: 'confirmed',
          provider_booking_id: 'flight-booking-1',
          provider_booking_ref: 'flight-booking-1',
          source: 'web',
          origin: 'MIA',
          destination: 'NAS',
          amount: 540,
          currency: 'USD',
        }),
      }),
    ]))
  })

  test('surfaces flight local-save failure after provider booking succeeds', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'trips') return selectMaybeSingle({ id: 'trip-1' })
      throw new Error(`Unexpected user table: ${table}`)
    })
    const persistence = adminPersistenceMock({
      insertedBookingId: 'flight-booking-row-1',
      tripItemInsertError: 'trip flight insert failed',
    })
    mocks.createClient.mockResolvedValue(clientWithAuth({ id: 'user-1' }, from))
    mocks.createAdminClient.mockReturnValue(persistence.admin)
    mocks.callTravelProvider.mockResolvedValue({
      status: 200,
      data: {
        data: [{
          id: 'flight-booking-1',
          status: 'TICKETED',
          price: { amount: 540, currency: 'USD' },
          segments: [{
            departure: { iataCode: 'MIA' },
            arrival: { iataCode: 'NAS' },
            departureTime: '2026-08-01T13:00:00Z',
            arrivalTime: '2026-08-01T14:10:00Z',
            airlineName: 'Bahamasair',
          }],
        }],
      },
    })

    const response = await flightBook(jsonRequest({
      tripId: 'trip-1',
      offerId: 'offer-123',
      prebookId: 'flight-prebook-1',
      transactionId: 'txn-1',
      paymentIntentId: 'pi_flight_local_failed',
      amount: 540,
      currency: 'USD',
      origin: 'MIA',
      destination: 'NAS',
    }))
    const body = await response.json()

    expect(response.status).toBe(202)
    expect(body).toMatchObject({
      bookingId: 'flight-booking-1',
      bookingRecordId: 'flight-booking-row-1',
      tripItemId: null,
      providerStatus: 'confirmed',
      paymentStatus: 'paid',
      localStatus: 'failed',
      supportRequired: true,
    })
    expect(body.localError).toContain('trip_flights insert failed')
    expect(body.localError).toContain('trip flight insert failed')
  })
})

describe('booking return API', () => {
  test('returns airline check-in context for a reconciled flight', async () => {
    const booking = {
      id: 'booking-flight-1',
      trip_id: 'trip-1',
      user_id: 'user-1',
      booking_type: 'flight',
      type: 'flight',
      provider: 'liteapi',
      status: 'confirmed',
      amount: 540,
      currency: 'usd',
      paid_at: '2026-08-01T10:00:00Z',
      stripe_payment_intent_id: 'pi_flight_1',
      booking_ref: 'UP1234',
      booking_reference: 'UP1234',
      external_reference: 'UP1234',
      financial_metadata: { source_surface: 'web' },
      raw_response: {},
    }
    let flightSelect: ReturnType<typeof vi.fn> | null = null
    const from = vi.fn((table: string) => {
      if (table === 'trips') return selectMaybeSingle({ id: 'trip-1' })
      if (table === 'bookings') return selectMaybeSingle(booking)
      if (table === 'trip_flights') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn().mockResolvedValue({
            data: [{
              id: 'flight-item-1',
              booking_reference: 'UP1234',
              stripe_payment_intent_id: 'pi_flight_1',
              airline: 'Bahamasair',
              departure_at: '2026-08-20T13:00:00.000Z',
            }],
            error: null,
          }),
        }
        flightSelect = query.select
        return query
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    mocks.createClient.mockResolvedValue(clientWithAuth({ id: 'user-1' }, from))

    const response = await getBookingReturn(
      new Request('http://localhost.test/api'),
      { params: { id: 'trip-1', bookingId: 'booking-flight-1' } },
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(flightSelect).toHaveBeenCalledWith(
      'id, booking_reference, stripe_payment_intent_id, airline, departure_at',
    )
    expect(body).toMatchObject({
      tripItemId: 'flight-item-1',
      provider: 'flight_liteapi',
      providerReference: 'UP1234',
      airline: 'Bahamasair',
      departureAt: '2026-08-20T13:00:00.000Z',
      paymentStatus: 'paid',
      providerStatus: 'confirmed',
      reconciled: true,
    })
  })

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

  test('uses payment intent to attach the exact canonical stay and blocks stale confirmed rows', async () => {
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
      stripe_payment_intent_id: 'pi_failed_stay',
      booking_ref: 'lite-booking-1',
      booking_reference: 'stale-confirmation-1',
      external_reference: 'stale-confirmation-1',
      financial_metadata: { source_surface: 'web', provider_status: 'CONFIRMED' },
      raw_response: {},
    }
    const stayRows = [
      {
        id: 'older-stay-item',
        status: 'booked',
        booking_reference: 'older-confirmation',
        stripe_payment_intent_id: 'pi_other',
      },
      {
        id: 'failed-stay-item',
        status: 'failed',
        booking_reference: null,
        stripe_payment_intent_id: 'pi_failed_stay',
      },
    ]
    let accommodationQuery: ReturnType<typeof vi.fn> | null = null
    const from = vi.fn((table: string) => {
      if (table === 'trips') return selectMaybeSingle({ id: 'trip-1' })
      if (table === 'bookings') return selectMaybeSingle(booking)
      if (table === 'trip_accommodations') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn().mockResolvedValue({ data: stayRows, error: null }),
        }
        accommodationQuery = query.select
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
    expect(accommodationQuery).toHaveBeenCalledWith('id, status, booking_reference, stripe_payment_intent_id')
    expect(body).toMatchObject({
      tripItemId: 'failed-stay-item',
      paymentStatus: 'paid',
      providerStatus: 'failed',
      providerReference: 'stale-confirmation-1',
      reconciled: false,
    })
  })

  test('explicit refunded booking status wins over paid timestamp', async () => {
    const booking = {
      id: 'booking-1',
      trip_id: 'trip-1',
      user_id: 'user-1',
      booking_type: 'accommodation',
      type: 'hotel',
      provider: 'liteapi',
      status: 'refunded',
      amount: 1200,
      currency: 'usd',
      paid_at: '2026-06-17T10:00:00Z',
      stripe_payment_intent_id: 'pi_refunded_stay',
      booking_ref: 'lite-booking-1',
      booking_reference: 'hotel-confirmation-1',
      external_reference: 'hotel-confirmation-1',
      financial_metadata: { source_surface: 'web', provider_status: 'REFUNDED' },
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
            data: [{
              id: 'refunded-stay-item',
              status: 'refunded',
              booking_reference: 'hotel-confirmation-1',
              stripe_payment_intent_id: 'pi_refunded_stay',
            }],
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
      tripItemId: 'refunded-stay-item',
      paymentStatus: 'refunded',
      providerStatus: 'cancelled',
      reconciled: false,
    })
  })

  test('does not reconcile paid provider-confirmed rows until the local booking row is confirmed', async () => {
    const booking = {
      id: 'booking-1',
      trip_id: 'trip-1',
      user_id: 'user-1',
      booking_type: 'accommodation',
      type: 'hotel',
      provider: 'liteapi',
      status: 'pending',
      amount: 1200,
      currency: 'usd',
      paid_at: '2026-06-17T10:00:00Z',
      stripe_payment_intent_id: 'pi_pending_booking',
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
            data: [{
              id: 'stay-item-1',
              status: 'booked',
              booking_reference: 'hotel-confirmation-1',
              stripe_payment_intent_id: 'pi_pending_booking',
            }],
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
      paymentStatus: 'paid',
      providerStatus: 'confirmed',
      providerReference: 'hotel-confirmation-1',
      tripItemId: 'stay-item-1',
      reconciled: false,
    })
  })

  test('does not reconcile when the provider reference exists but no canonical trip item is attached', async () => {
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
      stripe_payment_intent_id: 'pi_missing_item',
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
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
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
      tripItemId: null,
      paymentStatus: 'paid',
      providerStatus: 'confirmed',
      providerReference: 'hotel-confirmation-1',
      reconciled: false,
    })
  })
})
