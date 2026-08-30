import { describe, expect, test } from 'vitest'
import {
  appendFlightCheckoutSummary,
  flightCheckoutSummaryFromCard,
  flightCheckoutSummaryFromSearchParams,
} from '@/lib/flight-checkout-summary'

describe('flight checkout baggage summary', () => {
  test('preserves baggage weights and dimensions through the checkout URL', () => {
    const summary = flightCheckoutSummaryFromCard({
      route: 'MIA to NAS',
      baggage: {
        carry_on: true,
        checked: 1,
        allowances: [
          { type: 'carry_on', pieces: 1, weightKg: 10, dimensions: '55 × 40 × 23 cm' },
          { type: 'checked', pieces: 1, weightKg: 23, dimensions: '90 × 75 × 43 cm' },
        ],
      },
    })

    const path = appendFlightCheckoutSummary('/flights/offer-1/book', summary)
    const params = Object.fromEntries(new URL(path, 'https://example.test').searchParams.entries())

    expect(flightCheckoutSummaryFromSearchParams(params)).toMatchObject({
      carryOn: true,
      checkedBags: 1,
      baggageAllowances: [
        { type: 'carry_on', pieces: 1, weightKg: 10, dimensions: '55 × 40 × 23 cm' },
        { type: 'checked', pieces: 1, weightKg: 23, dimensions: '90 × 75 × 43 cm' },
      ],
    })
  })

  test('preserves decoded aircraft labels through the checkout URL', () => {
    const summary = flightCheckoutSummaryFromCard({
      route: 'MIA to NAS',
      aircraft_types: ['Boeing 737-800'],
      flight_legs: [{
        direction: 'OUTBOUND',
        route: 'MIA to NAS',
        aircraft: 'Boeing 737-800',
      }],
    })

    const path = appendFlightCheckoutSummary('/flights/offer-1/book', summary)
    const params = Object.fromEntries(new URL(path, 'https://example.test').searchParams.entries())

    expect(flightCheckoutSummaryFromSearchParams(params)).toMatchObject({
      aircraft: 'Boeing 737-800',
      legs: [{ aircraft: 'Boeing 737-800' }],
    })
  })

  test('preserves provider fare line items, including zero-valued fees, through the checkout URL', () => {
    const summary = flightCheckoutSummaryFromCard({
      price: 345,
      base_fare: 280,
      taxes: 65,
      fees: 0,
      currency: 'USD',
    })
    const path = appendFlightCheckoutSummary('/flights/offer-1/book', summary)
    const params = Object.fromEntries(new URL(path, 'https://example.test').searchParams.entries())

    expect(params).toMatchObject({
      price: '345',
      baseFare: '280',
      taxes: '65',
      fees: '0',
    })
    expect(flightCheckoutSummaryFromSearchParams(params)).toMatchObject({
      price: 345,
      baseFare: 280,
      taxes: 65,
      fees: 0,
    })
  })
})
