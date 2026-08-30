import { beforeEach, describe, expect, test, vi } from 'vitest'

const providerMocks = vi.hoisted(() => ({
  callTravelProvider: vi.fn(),
  getProviderErrorResponse: vi.fn((error: unknown) => ({
    error: error instanceof Error ? error.message : 'Provider request failed.',
    details: null,
    status: 500,
  })),
}))

vi.mock('@/lib/travel-booking/provider', () => ({
  callTravelProvider: providerMocks.callTravelProvider,
  getProviderErrorResponse: providerMocks.getProviderErrorResponse,
}))

import { POST } from '@/app/api/flights/search/route'

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost.test/api/flights/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/flights/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('uses requested passengers for provider search and card display fallback', async () => {
    providerMocks.callTravelProvider.mockResolvedValue({
      data: {
        data: [{
          journeys: [{
            parameters: { adults: 1 },
            totalDuration: { minutes: 64 },
            segments: [{
              segmentKey: 'segment-1',
              direction: 'OUTBOUND',
              originCode: 'MIA',
              destinationCode: 'NAS',
              departureTime: '2026-07-03T16:50:00-04:00',
              arrivalTime: '2026-07-03T17:54:00-04:00',
              carrier: {
                marketingName: 'American Airlines',
                marketingCode: 'AA',
                marketingFlightNumber: '221',
              },
            }],
            offers: [{
              offerId: 'offer-1',
              pricing: { display: { total: 527, base: 450, taxes: 77, fees: 0, currency: 'USD' } },
              fare: { family: 'Business', brandName: 'Main Cabin' },
              terms: { refundable: false },
              baggage: { included: [{ description: '1 checked bag' }] },
              expiresAt: '2026-06-19T12:30:00.000Z',
              segmentAmenities: [{ segmentKey: 'segment-1', aircraftType: '738' }],
            }],
          }],
        }],
      },
    })

    const response = await POST(jsonRequest({
      origin_city: 'Miami',
      destination: 'NAS',
      departure_date: '2026-07-03',
      passengers: 2,
      cabin_class: 'business',
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(providerMocks.callTravelProvider).toHaveBeenCalledWith('/flights/rates', expect.objectContaining({
      adults: 2,
      cabinClass: 'BUSINESS',
    }))
    expect(payload.cards[0]).toMatchObject({
      card_type: 'flight',
      offer_id: 'offer-1',
      passengers: 2,
      cabin_class: 'Business',
      price: 527,
      base_fare: 450,
      taxes: 77,
      fees: 0,
      flight_number: 'AA 221',
      flight_numbers: ['AA 221'],
      aircraft: 'Boeing 737-800',
      aircraft_types: ['Boeing 737-800'],
      aircraft_codes: ['738'],
    })
  })

  test('maps LiteAPI baggage and outbound layovers into card decision details', async () => {
    providerMocks.callTravelProvider.mockResolvedValue({
      data: {
        data: [{
          journeys: [{
            parameters: { adults: 1 },
            totalDuration: { minutes: 385 },
            segments: [
              {
                direction: 'OUTBOUND',
                originCode: 'MIA',
                destinationCode: 'CLT',
                departureTime: '2026-07-03T06:21:00',
                arrivalTime: '2026-07-03T08:35:00',
                carrier: {
                  marketingName: 'American Airlines',
                  marketingCode: 'AA',
                },
              },
              {
                direction: 'OUTBOUND',
                originCode: 'CLT',
                destinationCode: 'NAS',
                departureTime: '2026-07-03T09:18:00',
                arrivalTime: '2026-07-03T11:38:00',
                carrier: {
                  marketingName: 'American Airlines',
                  marketingCode: 'AA',
                },
              },
            ],
            offers: [{
              offerId: 'offer-connection',
              pricing: { display: { total: 391.5, currency: 'USD' } },
              fare: { family: 'Main Cabin' },
              terms: { refundable: false, changeable: true },
              baggage: {
                hasCarryOnBag: true,
                hasCheckedBag: true,
                included: [
                  { bagType: 'cabin', description: 'Cabin bag 55x40x23cm', pieces: 1, weightKg: 10 },
                  { bagType: 'checked', description: 'Checked bag 90 x 75 x 43 cm', pieces: 1, weightKg: 23 },
                ],
              },
              expiration: '2026-06-20T15:30:00.000Z',
            }],
          }],
        }],
      },
    })

    const response = await POST(jsonRequest({
      origin_city: 'Miami',
      destination: 'NAS',
      departure_date: '2026-07-03',
      passengers: 1,
      cabin_class: 'economy',
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.cards[0]).toMatchObject({
      offer_id: 'offer-connection',
      stops: '1 stop',
      baggage: {
        carry_on: true,
        checked: 1,
        allowances: [
          {
            type: 'carry_on',
            pieces: 1,
            weightKg: 10,
            dimensions: '55 × 40 × 23 cm',
          },
          {
            type: 'checked',
            pieces: 1,
            weightKg: 23,
            dimensions: '90 × 75 × 43 cm',
          },
        ],
      },
      refundable: false,
      changeable: true,
      layovers: [{ airport: 'CLT', duration: '43m' }],
    })
    expect(payload.cards[0]).not.toHaveProperty('base_fare')
    expect(payload.cards[0]).not.toHaveProperty('taxes')
    expect(payload.cards[0]).not.toHaveProperty('fees')
  })

  test('preserves outbound and inbound legs for round-trip checkout', async () => {
    providerMocks.callTravelProvider.mockResolvedValue({
      data: {
        data: [{
          journeys: [{
            parameters: { adults: 1 },
            totalDuration: { minutes: 265 },
            segments: [
              {
                direction: 'OUTBOUND',
                originCode: 'MIA',
                destinationCode: 'NAS',
                departureTime: '2026-07-19T16:50:00',
                arrivalTime: '2026-07-19T17:54:00',
                carrier: {
                  marketingName: 'American Airlines',
                  marketingCode: 'AA',
                },
              },
              {
                direction: 'INBOUND',
                originCode: 'NAS',
                destinationCode: 'MIA',
                departureTime: '2026-07-24T11:10:00',
                arrivalTime: '2026-07-24T12:18:00',
                carrier: {
                  marketingName: 'American Airlines',
                  marketingCode: 'AA',
                },
              },
            ],
            offers: [{
              offerId: 'offer-roundtrip',
              pricing: { display: { total: 404, currency: 'USD' } },
              fare: { family: 'Main Cabin' },
              terms: { refundable: false },
            }],
          }],
        }],
      },
    })

    const response = await POST(jsonRequest({
      origin_city: 'Miami',
      destination: 'NAS',
      departure_date: '2026-07-19',
      return_date: '2026-07-24',
      passengers: 1,
      cabin_class: 'economy',
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(providerMocks.callTravelProvider).toHaveBeenCalledWith('/flights/rates', expect.objectContaining({
      legs: [
        { origin: 'MIA', destination: 'NAS', date: '2026-07-19', direction: 'OUTBOUND' },
        { origin: 'NAS', destination: 'MIA', date: '2026-07-24', direction: 'INBOUND' },
      ],
    }))
    expect(payload.cards[0]).toMatchObject({
      offer_id: 'offer-roundtrip',
      trip_type: 'round_trip',
      flight_legs: [
        {
          direction: 'OUTBOUND',
          route: 'MIA to NAS',
          departure: '4:50 PM',
          arrival: '5:54 PM',
          duration: '1h 4m',
          stops: 'Direct',
        },
        {
          direction: 'INBOUND',
          route: 'NAS to MIA',
          departure: '11:10 AM',
          arrival: '12:18 PM',
          duration: '1h 8m',
          stops: 'Direct',
        },
      ],
    })
  })
})
