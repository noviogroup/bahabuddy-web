import { describe, expect, test } from 'vitest'
import {
  normalizeFlightAncillaries,
  normalizeFlightSeatMaps,
  normalizeSelectedFlightServices,
  normalizeSelectedSeatServices,
  selectedAncillaryServices,
  selectedSeatServices,
} from '@/lib/flight-seat-map'

describe('flight seat map', () => {
  test('normalizes LiteAPI seat metadata and ignores non-seat services', () => {
    const maps = normalizeFlightSeatMaps({
      servicesAttachable: {
        groups: [{
          name: 'MIA to NAS',
          segmentKey: 'segment-1',
          services: [{
            serviceId: 'seat-12c',
            category: 'seat',
            name: 'Seat 12C',
            pricing: { display: { amount: 25, currency: 'usd' } },
            metadata: { seat: { seatRow: 12, seatColumn: 'C', seatType: 'extra_legroom', position: 'aisle' } },
          }, { serviceId: 'bag-1', category: 'baggage' }],
        }],
      },
    })

    expect(maps).toHaveLength(1)
    expect(maps[0].segmentLabel).toBe('MIA to NAS')
    expect(maps[0].seats[0]).toMatchObject({ serviceId: 'seat-12c', seatNumber: '12C', price: 25, currency: 'USD' })
  })

  test('serializes passenger assignments for the attach-services endpoint', () => {
    const seat = normalizeFlightSeatMaps({
      servicesAttachable: { groups: [{ services: [{ serviceId: 'seat-4a', category: 'seat', name: 'Seat 4A' }] }] },
    })[0].seats[0]

    expect(selectedSeatServices({ 'segment-1': { 1: seat } })).toEqual([
      { passengerIndex: 1, serviceId: 'seat-4a', quantity: 1 },
    ])
  })

  test('validates browser seat assignments before forwarding them to LiteAPI', () => {
    expect(normalizeSelectedSeatServices([
      { passenger_index: 0, service_id: 'seat-4a', quantity: 99 },
    ])).toEqual([{ passengerIndex: 0, serviceId: 'seat-4a', quantity: 1 }])
    expect(() => normalizeSelectedSeatServices([
      { passengerIndex: -1, serviceId: '' },
    ])).toThrow(/requires a non-negative passengerIndex/i)
  })

  test('normalizes only provider-returned baggage, meal, and lounge services', () => {
    const options = normalizeFlightAncillaries({
      servicesAttachable: {
        groups: [{
          name: 'MIA to NAS',
          segmentKey: 'segment-1',
          services: [
            {
              serviceId: 'bag-23kg',
              category: 'EXTRA_BAGGAGE',
              name: 'Checked bag up to 23 kg',
              pricing: { display: { amount: 45, currency: 'usd' } },
            },
            {
              serviceId: 'meal-vegan',
              category: 'meal',
              name: 'Vegan meal',
              pricing: { display: { amount: 12, currency: 'USD' } },
            },
            {
              serviceId: 'lounge-nas',
              category: 'lounge_access',
              name: 'Nassau lounge day pass',
              pricing: { display: { amount: 38, currency: 'USD' } },
            },
            { serviceId: 'priority', category: 'boarding', name: 'Priority boarding' },
          ],
        }],
      },
    })

    expect(options.map((option) => option.category)).toEqual(['baggage', 'lounge', 'meal'])
    expect(options[0]).toMatchObject({ serviceId: 'bag-23kg', segmentLabel: 'MIA to NAS', price: 45, currency: 'USD' })
  })

  test('combines ancillary passenger assignments with the generic attach contract', () => {
    const [option] = normalizeFlightAncillaries({
      servicesAttachable: { groups: [{ services: [{ serviceId: 'bag-23kg', category: 'baggage', name: 'Checked bag' }] }] },
    })

    expect(selectedAncillaryServices({ baggage: { 0: option } })).toEqual([
      { passengerIndex: 0, serviceId: 'bag-23kg', quantity: 1 },
    ])
    expect(normalizeSelectedFlightServices([
      { passenger_index: 0, service_id: 'bag-23kg', quantity: 2 },
    ])).toEqual([{ passengerIndex: 0, serviceId: 'bag-23kg', quantity: 2 }])
  })
})
