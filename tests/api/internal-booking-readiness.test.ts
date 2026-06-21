import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { GET } from '@/app/api/internal/booking-readiness/route'

const ORIGINAL_ENV = { ...process.env }

function setReadyEnv() {
  process.env.BOOKING_READINESS_TOKEN = 'readiness-token-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://cxcfymhoncysyloutvkh.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-redacted'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret'
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_redacted'
  process.env.TRAVEL_BOOKING_API_KEY = 'prod_liteapi_private_secret'
  process.env.TRAVEL_BOOKING_API_BASE_URL = 'https://api.liteapi.travel/v3.0'
  process.env.TRAVEL_BOOKING_BOOK_BASE_URL = 'https://book.liteapi.travel/v3.0'
}

function request(token = 'readiness-token-secret') {
  return new Request('http://localhost.test/api/internal/booking-readiness', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  process.env = { ...ORIGINAL_ENV }
})

afterEach(() => {
  vi.unstubAllGlobals()
  process.env = { ...ORIGINAL_ENV }
})

describe('GET /api/internal/booking-readiness', () => {
  test('fails closed when no readiness token is configured', async () => {
    delete process.env.BOOKING_READINESS_TOKEN
    delete process.env.INTERNAL_API_SECRET

    const response = await GET(request('anything'))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toMatchObject({
      ready: false,
      error: 'booking_readiness_token_not_configured',
    })
  })

  test('rejects missing or invalid bearer token before schema checks', async () => {
    setReadyEnv()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request('wrong-token'))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({ ready: false, error: 'not_authorized' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('returns redacted runtime readiness when env and schema checks pass', async () => {
    setReadyEnv()
    const fetchMock = vi.fn(async () => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request())
    const body = await response.json()
    const serialized = JSON.stringify(body)

    expect(response.status).toBe(200)
    expect(body.ready).toBe(true)
    expect(body.provider).toBe('liteapi')
    expect(body.payment).toBe('stripe_edge_function')
    expect(body.sourceModel).toEqual({
      operational: ['bookings', 'trip_accommodations', 'trip_flights'],
      auditOnly: ['travel_booking_records'],
    })
    expect(body.env).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'SUPABASE_SERVICE_ROLE_KEY', scope: 'server', present: true }),
      expect.objectContaining({ key: 'LiteAPI private key', scope: 'server', present: true, mode: 'production' }),
      expect.objectContaining({ key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', scope: 'public', present: true, mode: 'test' }),
    ]))
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(serialized).not.toContain('readiness-token-secret')
    expect(serialized).not.toContain('service-role-secret')
    expect(serialized).not.toContain('prod_liteapi_private_secret')
  })

  test('returns not-ready when a canonical schema check fails', async () => {
    setReadyEnv()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: '42703', message: 'missing column' }), { status: 400 }))
      .mockResolvedValue(new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.ready).toBe(false)
    expect(body.schema[0]).toMatchObject({
      relation: 'bookings',
      ok: false,
      status: 400,
      detail: '42703: missing column',
    })
  })
})
