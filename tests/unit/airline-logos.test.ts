import { describe, expect, it } from 'vitest'
import { airlineCodeFromName, normalizeAirlineCode, resolveAirlineLogoUrl } from '@/lib/airline-logos'

describe('airline logo helpers', () => {
  it('normalizes two and three character airline codes', () => {
    expect(normalizeAirlineCode(' aa ')).toBe('AA')
    expect(normalizeAirlineCode('3m')).toBe('3M')
    expect(normalizeAirlineCode('American Airlines')).toBe('')
  })

  it('maps common Bahamas route carriers by name', () => {
    expect(airlineCodeFromName('American Airlines')).toBe('AA')
    expect(airlineCodeFromName('Bahamasair')).toBe('UP')
    expect(airlineCodeFromName('Silver Airways')).toBe('3M')
  })

  it('prefers a provider logo and otherwise falls back to the carrier CDN', () => {
    expect(resolveAirlineLogoUrl({
      providerLogoUrl: 'https://example.com/logo.png',
      airlineCode: 'AA',
      airlineName: 'American Airlines',
    })).toBe('https://example.com/logo.png')

    expect(resolveAirlineLogoUrl({
      airlineCode: 'AA',
      airlineName: 'American Airlines',
    })).toContain('/AA.png?')

    expect(resolveAirlineLogoUrl({
      airlineName: 'Bahamasair',
    })).toContain('/UP.png?')
  })
})
