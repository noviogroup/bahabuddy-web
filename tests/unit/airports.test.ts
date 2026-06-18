import { describe, expect, test } from 'vitest'
import { resolveAirportCode } from '@/lib/airports'

describe('resolveAirportCode', () => {
  test('passes through IATA codes', () => {
    expect(resolveAirportCode('mia')).toBe('MIA')
    expect(resolveAirportCode('NAS')).toBe('NAS')
  })

  test('resolves common origin cities', () => {
    expect(resolveAirportCode('Miami')).toBe('MIA')
    expect(resolveAirportCode('Fort Lauderdale')).toBe('FLL')
    expect(resolveAirportCode('New York')).toBe('JFK')
    expect(resolveAirportCode('Atlanta')).toBe('ATL')
  })

  test('returns null for unknown values', () => {
    expect(resolveAirportCode('')).toBeNull()
    expect(resolveAirportCode('Not an airport')).toBeNull()
  })
})
