import { describe, expect, test } from 'vitest'
import { createBookingListItems } from '@/lib/booking-list'

describe('createBookingListItems', () => {
  test('uses canonical flight bookings as the row source and enriches display from trip_flights', () => {
    const items = createBookingListItems({
      bookings: [{
        id: 'booking-flight-1',
        trip_id: 'trip-1',
        booking_type: 'flight',
        provider: 'liteapi',
        status: 'confirmed',
        amount: 345,
        currency: 'usd',
        paid_at: '2026-06-19T01:00:00Z',
        stripe_payment_intent_id: 'pi-flight-1',
        booking_reference: 'PNR123',
        financial_metadata: { source_surface: 'web', provider_status: 'TICKETED' },
      }],
      trips: [{ id: 'trip-1', name: 'Summer Bahamas' }],
      flights: [{
        id: 'flight-item-1',
        trip_id: 'trip-1',
        origin: 'MIA',
        destination: 'NAS',
        airline: 'Bahamasair',
        departure_at: '2026-07-03T10:00:00Z',
        arrival_at: '2026-07-03T11:00:00Z',
        price: 999,
        booking_reference: 'PNR123',
        stripe_payment_intent_id: 'pi-flight-1',
      }],
      accommodations: [],
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: 'booking-flight-1',
      tripId: 'trip-1',
      tripName: 'Summer Bahamas',
      type: 'flight',
      title: 'MIA -> NAS',
      subtitle: 'Bahamasair',
      price: 345,
      currency: 'usd',
      priceQualifier: 'total',
      bookingReference: 'PNR123',
      status: 'confirmed',
      paymentStatus: 'paid',
      providerStatus: 'confirmed',
      provider: 'liteapi',
      sourceSurface: 'web',
    })
    expect(items[0].dates).toBe('Jul 3, 2026')
  })

  test('matches stay bookings by provider reference and uses canonical amount/status', () => {
    const items = createBookingListItems({
      bookings: [{
        id: 'booking-stay-1',
        trip_id: 'trip-1',
        booking_type: 'accommodation',
        type: 'hotel',
        provider: 'liteapi',
        status: 'refunded',
        amount: 1260,
        currency: 'usd',
        booking_ref: 'lite-booking-1',
        external_reference: 'hotel-confirmation-1',
        financial_metadata: { source_surface: 'mobile', provider_status: 'REFUNDED' },
      }],
      trips: [{ id: 'trip-1', name: 'Exuma Weekend' }],
      flights: [],
      accommodations: [{
        id: 'stay-item-1',
        trip_id: 'trip-1',
        name: 'Grand Isle Resort',
        island: 'Exuma',
        check_in: '2026-08-01',
        check_out: '2026-08-04',
        price_per_night: 520,
        total_price: 1560,
        currency: 'USD',
        status: 'refunded',
        booking_reference: 'hotel-confirmation-1',
        stripe_payment_intent_id: null,
      }],
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: 'booking-stay-1',
      tripName: 'Exuma Weekend',
      type: 'hotel',
      title: 'Grand Isle Resort',
      subtitle: 'Exuma',
      price: 1260,
      priceQualifier: 'total',
      bookingReference: 'hotel-confirmation-1',
      status: 'refunded',
      paymentStatus: 'refunded',
      providerStatus: 'cancelled',
      sourceSurface: 'mobile',
    })
    expect(items[0].dates).toBe('Aug 1, 2026 -> Aug 4, 2026')
  })

  test('does not list saved trip items without canonical booking rows', () => {
    const items = createBookingListItems({
      bookings: [],
      trips: [{ id: 'trip-1', name: 'Saved Draft' }],
      flights: [{
        id: 'saved-flight-1',
        trip_id: 'trip-1',
        origin: 'MIA',
        destination: 'NAS',
        airline: 'Bahamasair',
        departure_at: '2026-07-03T10:00:00Z',
        arrival_at: '2026-07-03T11:00:00Z',
        price: 345,
        booking_reference: 'PNR123',
        stripe_payment_intent_id: 'pi-flight-1',
      }],
      accommodations: [{
        id: 'saved-stay-1',
        trip_id: 'trip-1',
        name: 'Grand Isle Resort',
        island: 'Exuma',
        check_in: '2026-08-01',
        check_out: '2026-08-04',
        price_per_night: 520,
        total_price: 1560,
        currency: 'USD',
        status: 'booked',
        booking_reference: 'hotel-confirmation-1',
        stripe_payment_intent_id: 'pi-stay-1',
      }],
    })

    expect(items).toEqual([])
  })

  test('falls back to canonical metadata when no matching trip item exists', () => {
    const items = createBookingListItems({
      bookings: [{
        id: 'booking-stay-1',
        trip_id: 'trip-1',
        booking_type: 'accommodation',
        provider: 'liteapi',
        status: 'pending',
        amount: 800,
        currency: 'usd',
        stripe_payment_intent_id: 'pi-stay-1',
        booking_reference: null,
        financial_metadata: {
          source_surface: 'web',
          provider_status: 'PENDING',
          hotel_name: 'Atlantis Paradise Island',
          island: 'Paradise Island',
          checkin: '2026-09-10',
          checkout: '2026-09-12',
        },
      }],
      trips: [{ id: 'trip-1', name: 'Nassau Trip' }],
      flights: [],
      accommodations: [],
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      title: 'Atlantis Paradise Island',
      subtitle: 'Paradise Island',
      dates: 'Sep 10, 2026 -> Sep 12, 2026',
      paymentStatus: 'paid',
      providerStatus: 'pending',
      sourceSurface: 'web',
    })
  })
})
