import { describe, expect, test } from 'vitest'
import {
  readStaySearchParams,
  stayAmenitiesLabel,
  stayAmenityUrlValue,
  stayDateRangeLabel,
  stayDetailUrl,
  stayRoomsLabel,
  staySearchUrl,
  stayTravelerDetail,
  stayTravelerLabel,
} from '@/lib/stay-search-params'

describe('stay search params', () => {
  test('preserves booking context when changing a stay filter', () => {
    const params = readStaySearchParams({
      island: 'Exuma',
      city: 'George Town',
      traveler_type: 'groups',
      checkin: '2026-08-01',
      checkout: '2026-08-04',
      adults: '2',
      children: '1',
      rooms: '2',
    })

    expect(staySearchUrl(params, { type: 'Villa' })).toBe(
      '/stays?island=Exuma&city=George+Town&type=Villa&traveler_type=groups&checkin=2026-08-01&checkout=2026-08-04&adults=2&children=1&rooms=2',
    )
  })

  test('builds stay detail URLs with booking context only', () => {
    const params = readStaySearchParams({
      island: 'Exuma',
      city: 'George Town',
      type: 'Villa',
      sort: 'rating',
      checkin: '2026-08-01',
      checkout: '2026-08-04',
      adults: '2',
      children: '1',
      rooms: '2',
    })

    expect(stayDetailUrl('hotel 123', params)).toBe(
      '/stays/hotel%20123?checkin=2026-08-01&checkout=2026-08-04&adults=2&children=1&rooms=2',
    )
  })

  test('removes area independently while preserving island and booking context', () => {
    const params = readStaySearchParams({
      island: 'Nassau',
      city: 'Cable Beach',
      type: 'Resort',
      checkin: '2026-08-01',
      checkout: '2026-08-04',
      adults: '2',
    })

    expect(staySearchUrl(params, { city: undefined })).toBe(
      '/stays?island=Nassau&type=Resort&checkin=2026-08-01&checkout=2026-08-04&adults=2',
    )
  })

  test('validates traveler type filters and removes them independently', () => {
    const params = readStaySearchParams({
      island: 'Nassau',
      traveler_type: 'families',
      checkin: '2026-08-01',
      checkout: '2026-08-04',
    })

    expect(params.travelerType).toBe('families')
    expect(staySearchUrl(params, { traveler_type: undefined })).toBe(
      '/stays?island=Nassau&checkin=2026-08-01&checkout=2026-08-04',
    )

    expect(readStaySearchParams({ traveler_type: 'party' }).travelerType).toBe('')
  })

  test('removes only the overridden filter while keeping travel params', () => {
    const params = readStaySearchParams({
      island: 'Nassau',
      type: 'Resort',
      stars: '5',
      sort: 'stars',
      checkin: '2026-09-10',
      checkout: '2026-09-14',
      adults: '2',
      rooms: '1',
    })

    expect(staySearchUrl(params, { type: undefined })).toBe(
      '/stays?island=Nassau&stars=5&checkin=2026-09-10&checkout=2026-09-14&adults=2&rooms=1',
    )
  })

  test('preserves guest score and amenity filters while keeping booking context', () => {
    const params = readStaySearchParams({
      island: 'Nassau',
      type: 'Resort',
      guest_rating: '8',
      amenities: 'Pool, Beachfront, Spa',
      checkin: '2026-09-10',
      checkout: '2026-09-14',
      adults: '2',
      rooms: '1',
    })

    expect(params.minGuestRating).toBe(8)
    expect(params.amenities).toEqual(['Pool', 'Beachfront', 'Spa'])
    expect(stayAmenitiesLabel(params)).toBe('Pool +2')
    expect(stayAmenityUrlValue(params.amenities.filter((amenity) => amenity !== 'Beachfront'))).toBe('Pool,Spa')
    expect(staySearchUrl(params, { stars: '5' })).toBe(
      '/stays?island=Nassau&type=Resort&stars=5&guest_rating=8&amenities=Pool%2CBeachfront%2CSpa&checkin=2026-09-10&checkout=2026-09-14&adults=2&rooms=1',
    )
  })

  test('sanitizes invalid rating, sort, dates, and guest counts', () => {
    const params = readStaySearchParams({
      stars: '8',
      guest_rating: '11',
      sort: 'price',
      checkin: '08/01/2026',
      checkout: 'not-a-date',
      adults: '0',
      children: '-1',
      rooms: '20',
    })

    expect(params.minStars).toBeUndefined()
    expect(params.minGuestRating).toBeUndefined()
    expect(params.sort).toBe('stars')
    expect(params.checkin).toBe('')
    expect(params.checkout).toBe('')
    expect(params.adults).toBeUndefined()
    expect(params.children).toBeUndefined()
    expect(params.rooms).toBeUndefined()
  })

  test('keeps top rated as an explicit alternate sort', () => {
    const params = readStaySearchParams({
      island: 'Abaco',
      sort: 'rating',
      checkin: '2026-08-01',
      checkout: '2026-08-04',
    })

    expect(params.sort).toBe('rating')
    expect(staySearchUrl(params, { type: 'Hotel' })).toBe(
      '/stays?island=Abaco&type=Hotel&sort=rating&checkin=2026-08-01&checkout=2026-08-04',
    )
  })

  test('formats date, traveler, and room labels for the filter summary', () => {
    const params = readStaySearchParams({
      checkin: '2026-08-01',
      checkout: '2026-08-04',
      adults: '2',
      children: '1',
      rooms: '2',
    })

    expect(stayDateRangeLabel(params)).toBe('Aug 1, 2026 - Aug 4, 2026')
    expect(stayTravelerLabel(params)).toBe('3 travelers')
    expect(stayTravelerDetail(params)).toBe('2 adults, 1 child')
    expect(stayRoomsLabel(params)).toBe('2 rooms')
  })
})
