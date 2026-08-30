import { describe, expect, test } from 'vitest'
import { airlineCheckInLink } from '@/lib/airline-check-in'

describe('airlineCheckInLink', () => {
  test.each([
    ['American Airlines', 'www.aa.com'],
    ['Delta Air Lines', 'www.delta.com'],
    ['JetBlue', 'www.jetblue.com'],
    ['Bahamasair', 'book.bahamasair.com'],
  ])('uses the official %s check-in host', (airline, host) => {
    const link = airlineCheckInLink(airline)

    expect(new URL(link.href).host).toBe(host)
    expect(link.isAirlineLink).toBe(true)
  })

  test('recognizes the Bahamasair carrier code', () => {
    expect(airlineCheckInLink(null, 'UP').href).toBe(
      'https://book.bahamasair.com/web/ICIPNRSearch.xhtml',
    )
  })
})
