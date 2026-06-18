import { describe, expect, test } from 'vitest'
import {
  getStayTypeFilterOptions,
  stayPropertyTypeAliases,
  stayPropertyTypesMatch,
} from '@/lib/stay-property-types'

describe('stay property type filters', () => {
  test('matches hotels, homes, houses, and apartments through aliases', () => {
    expect(stayPropertyTypesMatch('Resort', 'hotels')).toBe(true)
    expect(stayPropertyTypesMatch('Guest House', 'homes')).toBe(true)
    expect(stayPropertyTypesMatch('Vacation Rental', 'houses')).toBe(true)
    expect(stayPropertyTypesMatch('Condominium', 'condos')).toBe(true)
    expect(stayPropertyTypesMatch('Villa', 'hotels')).toBe(false)
  })

  test('returns provider query aliases for user-facing stay types', () => {
    expect(stayPropertyTypeAliases('Home')).toContain('Guest House')
    expect(stayPropertyTypeAliases('House')).toContain('Vacation Home')
    expect(stayPropertyTypeAliases('Hotel')).toContain('Resort')
    expect(stayPropertyTypeAliases('Apartment')).toContain('Condominium')
  })

  test('keeps default chips available even when catalog rows are sparse', () => {
    expect(getStayTypeFilterOptions(['Guest House', 'Resort'])).toEqual(
      expect.arrayContaining(['Guest House', 'Resort', 'Home', 'House', 'Hotel']),
    )
  })
})
