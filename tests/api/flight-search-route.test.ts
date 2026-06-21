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
              direction: 'OUTBOUND',
              originCode: 'MIA',
              destinationCode: 'NAS',
              departureTime: '2026-07-03T16:50:00-04:00',
              arrivalTime: '2026-07-03T17:54:00-04:00',
              carrier: {
                marketingName: 'American Airlines',
                marketingCode: 'AA',
              },
            }],
            offers: [{
              offerId: 'offer-1',
              pricing: { display: { total: 527, currency: 'USD' } },
              fare: { family: 'Business', brandName: 'Main Cabin' },
              terms: { refundable: false },
              baggage: { included: [{ description: '1 checked bag' }] },
              expiresAt: '2026-06-19T12:30:00.000Z',
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
                hasCheckedBag: false,
                included: [{ bagType: 'cabin', description: 'Cabin bag', pieces: 1 }],
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
      baggage: { carry_on: true },
      refundable: false,
      changeable: true,
      layovers: [{ airport: 'CLT', duration: '43m' }],
    })
  })
})
