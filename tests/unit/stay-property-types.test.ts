import { describe, expect, test } from 'vitest'
import {
  getStayTypeFilterOptions,
  resolveStayPropertyTypeName,
  stayPropertyTypeAliases,
  stayPropertyTypeIds,
  stayPropertyTypesMatch,
} from '@/lib/stay-property-types'

describe('stay property type filters', () => {
  test('matches user-facing types through provider labels and ids', () => {
    expect(stayPropertyTypesMatch('Hotels', 'hotels')).toBe(true)
    expect(stayPropertyTypesMatch(null, 'hotels', 204)).toBe(true)
    expect(stayPropertyTypesMatch(null, 'condos', 229)).toBe(true)
    expect(stayPropertyTypesMatch('Holiday homes', 'homes')).toBe(true)
    expect(stayPropertyTypesMatch('Guest houses', 'houses')).toBe(true)
    expect(stayPropertyTypesMatch('Condominium', 'condos')).toBe(true)
    expect(stayPropertyTypesMatch('Resorts', 'hotels', 206)).toBe(false)
    expect(stayPropertyTypesMatch('Condos', 'apartments', 229)).toBe(false)
    expect(stayPropertyTypesMatch('Villa', 'hotels')).toBe(false)
  })

  test('returns provider query aliases for user-facing stay types', () => {
    expect(stayPropertyTypeAliases('Home')).toContain('Holiday homes')
    expect(stayPropertyTypeAliases('House')).toContain('Guest houses')
    expect(stayPropertyTypeAliases('Hotel')).toContain('Hotels')
    expect(stayPropertyTypeAliases('Hotel')).not.toContain('Resort')
    expect(stayPropertyTypeAliases('Apartment')).toContain('Apartments')
    expect(stayPropertyTypeAliases('Apartment')).not.toContain('Condo')
  })

  test('maps LiteAPI hotel type ids to filter groups', () => {
    expect(resolveStayPropertyTypeName(null, 229)).toBe('Condos')
    expect(stayPropertyTypeIds('Condo')).toContain(229)
    expect(stayPropertyTypeIds('Apartment')).toEqual(expect.arrayContaining([201, 219]))
    expect(stayPropertyTypeIds('Resort')).toContain(206)
  })

  test('keeps default chips available even when catalog rows are sparse', () => {
    expect(getStayTypeFilterOptions(['Guest House', 'Resort'])).toEqual(
      expect.arrayContaining(['Guest House', 'Resort', 'Home', 'House', 'Hotel']),
    )
  })
})
