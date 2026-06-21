import { describe, expect, test } from 'vitest'
import {
  hotelMatchesTravelerType,
  parseStayTravelerType,
  stayTravelerTypeLabel,
} from '@/lib/stay-traveler-types'

describe('stay traveler type filters', () => {
  test('parses only supported traveler fit values', () => {
    expect(parseStayTravelerType('families')).toBe('families')
    expect(parseStayTravelerType('wellness')).toBe('wellness')
    expect(parseStayTravelerType('party')).toBe('')
    expect(parseStayTravelerType('')).toBe('')
  })

  test('returns user-facing labels for supported traveler fits', () => {
    expect(stayTravelerTypeLabel('families')).toBe('Families')
    expect(stayTravelerTypeLabel('work')).toBe('Work trips')
    expect(stayTravelerTypeLabel('party')).toBe('')
  })

  test('matches family stays from real amenity signals', () => {
    expect(hotelMatchesTravelerType({
      name: 'Beach family resort',
      property_type_name: 'Resort',
      star_rating: 4,
      review_score: 8.4,
      amenities: ['Pool', 'Kitchenette', 'Parking'],
    }, 'families')).toBe(true)

    expect(hotelMatchesTravelerType({
      name: 'Quiet business hotel',
      property_type_name: 'Hotel',
      star_rating: 4,
      review_score: 8,
      amenities: ['Desk', 'Meeting room'],
    }, 'families')).toBe(false)
  })

  test('matches group and work stays from property and amenity signals', () => {
    expect(hotelMatchesTravelerType({
      name: 'Harbour villa',
      property_type_name: 'Villa',
      star_rating: 4,
      review_score: 8,
      amenities: ['Kitchen', 'Laundry'],
    }, 'groups')).toBe(true)

    expect(hotelMatchesTravelerType({
      name: 'Airport business hotel',
      property_type_name: 'Hotel',
      star_rating: 3,
      review_score: 8,
      amenities: ['Free WiFi', 'Meeting room', 'Parking'],
    }, 'work')).toBe(true)
  })

  test('matches couples and wellness stays without guessing price', () => {
    expect(hotelMatchesTravelerType({
      name: 'Ocean spa resort',
      property_type_name: 'Boutique Hotel',
      star_rating: 5,
      review_score: 9.1,
      amenities: ['Spa', 'Balcony', 'Private beach'],
    }, 'couples')).toBe(true)

    expect(hotelMatchesTravelerType({
      name: 'Wellness beach resort',
      property_type_name: 'Resort',
      star_rating: 4,
      review_score: 8.2,
      amenities: ['Fitness center', 'Yoga', 'Pool'],
    }, 'wellness')).toBe(true)
  })
})
