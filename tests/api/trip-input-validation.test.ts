import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Result = { data: unknown; error: unknown }
function query(result: Result, calls: Array<[string, unknown[]]> = []) {
  const q: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'update', 'insert', 'or', 'limit', 'order']) {
    q[method] = (...args: unknown[]) => { calls.push([method, args]); return q }
  }
  q.single = async () => result
  q.maybeSingle = async () => result
  q.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve)
  return q
}

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: mocks.from,
  }),
}))

import { PATCH } from '@/app/api/trips/[id]/update/route'
import { POST as createTrip } from '@/app/api/trips/route'
import { GET as getBooking } from '@/app/api/trips/[id]/bookings/[bookingId]/route'
import { isAllowedTripHeroImageUrl, isDateOnlyString, parseTripDate } from '@/lib/trips/trip-field-validation'

function patch(body: unknown) {
  return PATCH(new NextRequest('http://localhost.test/api/trips/t1/update', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), { params: { id: 't1' } })
}

beforeEach(() => {
  mocks.from.mockReset()
  mocks.from.mockImplementation(() => query({ data: { id: 't1' }, error: null }))
})

describe('trip field validation helpers', () => {
  test('dates', () => {
    expect(isDateOnlyString('2026-12-20')).toBe(true)
    expect(isDateOnlyString('2026-02-30')).toBe(false)
    expect(isDateOnlyString('next tuesday')).toBe(false)
    expect(isDateOnlyString('2026-12-20T00:00:00Z')).toBe(false)
    const d = parseTripDate('2026-12-20')!
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 11, 20])
  })

  test('hero images', () => {
    expect(isAllowedTripHeroImageUrl('https://tempo.cdn.tambourine.com/windsong/media/a.jpg')).toBe(true)
    expect(isAllowedTripHeroImageUrl('https://abc.supabase.co/storage/v1/object/public/x.jpg')).toBe(true)
    expect(isAllowedTripHeroImageUrl('/assets/tourism/nassau.jpg')).toBe(true)
    expect(isAllowedTripHeroImageUrl('http://tempo.cdn.tambourine.com/a.jpg')).toBe(false)
    expect(isAllowedTripHeroImageUrl('https://tracker.example/pixel.gif')).toBe(false)
    expect(isAllowedTripHeroImageUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedTripHeroImageUrl('//evil.com/a.jpg')).toBe(false)
    expect(isAllowedTripHeroImageUrl('https://abc.supabase.co/rest/v1/users')).toBe(false)
  })
})

describe('PATCH /api/trips/[id]/update (F136)', () => {
  test.each([
    [{ date_start: 'tomorrow' }],
    [{ date_start: '2026-12-20', date_end: '2026-12-10' }],
    [{ party_size: 0 }],
    [{ party_size: 2.5 }],
    [{ party_size: 500 }],
    [{ budget_estimate: -5 }],
    [{ hero_image_url: 'https://tracker.example/pixel.gif' }],
    [{ party_type: 42 }],
  ])('rejects %j', async (body) => {
    const res = await patch(body)
    expect(res.status).toBe(400)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('accepts valid edits and hides raw database errors', async () => {
    expect((await patch({ date_start: '2026-12-20', date_end: '2026-12-27', party_size: 4, budget_estimate: 3000 })).status).toBe(200)

    mocks.from.mockImplementation(() => query({ data: null, error: { message: 'invalid input syntax for type date' } }))
    const res = await patch({ party_size: 2 })
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('syntax')
  })
})

describe('POST /api/trips (F139)', () => {
  const post = (body: unknown) => createTrip(new Request('http://localhost.test/api/trips', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }))

  test('defaults activities to [] instead of throwing', async () => {
    const res = await post({ title: 'Nassau', destination: 'Nassau', startDate: null, endDate: null })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ tripId: 't1' })
  })

  test('validates before inserting (no orphan drafts)', async () => {
    expect((await post({ title: 'x', activities: [{ nope: true }] })).status).toBe(400)
    expect((await post({ title: 'x', startDate: 'soon' })).status).toBe(400)
    expect(mocks.from).not.toHaveBeenCalled()
  })
})

describe('GET booking status (F140)', () => {
  test('rejects filter-grammar characters and never uses .or()', async () => {
    const res = await getBooking(new Request('http://localhost.test'), { params: { id: 'trip-1', bookingId: 'x,user_id.neq.0' } })
    expect(res.status).toBe(404)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('looks up provider refs with eq() and strips raw provider payloads', async () => {
    const calls: Array<[string, unknown[]]> = []
    let bookingLookups = 0
    mocks.from.mockImplementation((table: string) => {
      if (table === 'trips') return query({ data: { id: 'trip-1' }, error: null })
      if (table === 'bookings') {
        bookingLookups += 1
        const found = bookingLookups === 4
        return query({
          data: found ? {
            id: 'b1', trip_id: 'trip-1', user_id: 'user-1', provider: 'other', status: 'pending',
            booking_reference: 'REF123', financial_metadata: { secret: 1 }, raw_response: { guest: 'x' },
          } : null,
          error: null,
        }, calls)
      }
      return query({ data: [], error: null })
    })
    const res = await getBooking(new Request('http://localhost.test'), { params: { id: 'trip-1', bookingId: 'REF123' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.id).toBe('b1')
    expect(body.booking.raw_response).toBeUndefined()
    expect(body.booking.financial_metadata).toBeUndefined()
    expect(calls.some(([m]) => m === 'or')).toBe(false)
    expect(calls).toContainEqual(['eq', ['booking_reference', 'REF123']])
    const selected = calls.find(([m]) => m === 'select')?.[1][0] as string
    expect(selected).not.toContain('raw_response')
  })
})
