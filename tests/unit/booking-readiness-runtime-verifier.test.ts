import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const script = readFileSync('scripts/verify-booking-readiness.mjs', 'utf8')
const route = readFileSync('src/app/api/internal/booking-readiness/route.ts', 'utf8')
const envExample = readFileSync('.env.example', 'utf8')

describe('booking readiness runtime verifier', () => {
  test('can verify deployed web runtime without provider booking side effects', () => {
    expect(script).toContain('--runtime-url')
    expect(script).toContain('BOOKING_READINESS_RUNTIME_URL')
    expect(script).toContain('BOOKING_READINESS_TOKEN')
    expect(script).toContain('/api/internal/booking-readiness')
    expect(script).toContain('body.ready === true')
    expect(script).toContain('travel_booking_records')
    expect(script).toContain('Netlify visitor password protection or an old deploy')
    expect(script).not.toContain('/rates/book')
    expect(script).not.toContain('/flights/bookings')
  })

  test('runtime route is protected and separates operational from audit sources', () => {
    expect(route).toContain('BOOKING_READINESS_TOKEN')
    expect(route).toContain('INTERNAL_API_SECRET')
    expect(route).toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(route).toContain("operational: ['bookings', 'trip_accommodations', 'trip_flights']")
    expect(route).toContain("auditOnly: ['travel_booking_records']")
    expect(route).toContain("'Cache-Control': 'no-store, max-age=0'")
  })

  test('env example documents deployed runtime readiness keys as server-side only', () => {
    expect(envExample).toContain('BOOKING_READINESS_TOKEN=')
    expect(envExample).toContain('BOOKING_READINESS_RUNTIME_URL=')
    expect(envExample).toContain('Server-side only')
    expect(envExample).not.toContain('NEXT_PUBLIC_BOOKING_READINESS')
  })
})
