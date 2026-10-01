import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Result = { data: unknown; error: unknown }

/** Chainable PostgREST-ish query mock resolving to `result` when awaited. */
function query(result: Result, calls: Array<[string, unknown[]]> = []) {
  const q: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'gt', 'order', 'limit', 'insert', 'delete', 'not']) {
    q[method] = (...args: unknown[]) => { calls.push([method, args]); return q }
  }
  q.single = async () => result
  q.maybeSingle = async () => result
  q.then = (resolve: (value: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(result).then(resolve, reject)
  return q
}

const mocks = vi.hoisted(() => ({
  user: { id: 'owner-1' } as { id: string } | null,
  tables: {} as Record<string, () => unknown>,
  admin: null as null | { from: (t: string) => unknown },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
    from: (table: string) => mocks.tables[table](),
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => mocks.admin }))

import { DELETE as revokeInvite } from '@/app/api/trips/invite/route'
import { POST as createShare } from '@/app/api/trips/share/route'
import { generateShareCode, isValidShareCode } from '@/lib/share-codes'

beforeEach(() => {
  mocks.user = { id: 'owner-1' }
  mocks.tables = {}
  mocks.admin = null
})

describe('invite revoke (F19)', () => {
  const del = () => revokeInvite(new NextRequest('http://localhost.test/api/trips/invite?tripId=trip-1', { method: 'DELETE' }))

  test('reports success only with the number of links actually deleted', async () => {
    mocks.tables.trips = () => query({ data: { user_id: 'owner-1' }, error: null })
    const calls: Array<[string, unknown[]]> = []
    mocks.admin = { from: () => query({ data: [{ id: 'l1' }, { id: 'l2' }], error: null }, calls) }
    const res = await del()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, revoked: 2 })
    expect(calls.map(([m]) => m)).toContain('delete')
    expect(calls).toContainEqual(['eq', ['share_type', 'collaborative']])
  })

  test('returns 404 instead of success when nothing was deleted', async () => {
    mocks.tables.trips = () => query({ data: { user_id: 'owner-1' }, error: null })
    mocks.admin = { from: () => query({ data: [], error: null }) }
    const res = await del()
    expect(res.status).toBe(404)
    expect((await res.json()).success).toBeUndefined()
  })

  test('does not revoke for non-owners and fails honestly without the admin client', async () => {
    mocks.tables.trips = () => query({ data: { user_id: 'someone-else' }, error: null })
    expect((await del()).status).toBe(404)

    mocks.tables.trips = () => query({ data: { user_id: 'owner-1' }, error: null })
    mocks.admin = null
    expect((await del()).status).toBe(503)
  })
})

describe('public share link creation (F56/F114)', () => {
  const post = (body: unknown) => createShare(new NextRequest('http://localhost.test/api/trips/share', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }))

  test('creates an expiring crypto-random code for the trip owner', async () => {
    let inserted: Record<string, unknown> | null = null
    mocks.tables.trips = () => query({ data: { id: 'trip-1', user_id: 'owner-1' }, error: null })
    mocks.tables.share_links = () => {
      const lookup = query({ data: [], error: null })
      ;(lookup as Record<string, unknown>).insert = (row: Record<string, unknown>) => {
        inserted = row
        return query({ data: { short_code: row.short_code, expires_at: row.expires_at }, error: null })
      }
      return lookup
    }
    const res = await post({ tripId: 'trip-1' })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.code).toMatch(/^[A-Za-z0-9]{16}$/)
    expect(inserted).toMatchObject({ trip_id: 'trip-1', created_by: 'owner-1', share_type: 'link' })
    expect(new Date(String(inserted!.expires_at)).getTime()).toBeGreaterThan(Date.now())
  })

  test('surfaces insert failures instead of returning a code', async () => {
    mocks.tables.trips = () => query({ data: { id: 'trip-1', user_id: 'owner-1' }, error: null })
    mocks.tables.share_links = () => {
      const lookup = query({ data: [], error: null })
      ;(lookup as Record<string, unknown>).insert = () => query({ data: null, error: { message: 'duplicate key' } })
      return lookup
    }
    const res = await post({ tripId: 'trip-1' })
    expect(res.status).toBe(500)
    expect((await res.json()).code).toBeUndefined()
  })

  test('rejects signed-out users and non-owners', async () => {
    mocks.user = null
    expect((await post({ tripId: 'trip-1' })).status).toBe(401)
    mocks.user = { id: 'owner-1' }
    mocks.tables.trips = () => query({ data: { id: 'trip-1', user_id: 'other' }, error: null })
    expect((await post({ tripId: 'trip-1' })).status).toBe(404)
  })
})

describe('share codes', () => {
  test('are 16 base62 chars and unique', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateShareCode()))
    expect(codes.size).toBe(200)
    for (const code of codes) expect(code).toMatch(/^[A-Za-z0-9]{16}$/)
  })

  test('validates URL code shape', () => {
    expect(isValidShareCode('abc1234')).toBe(true)
    expect(isValidShareCode('inv-abc1234')).toBe(true)
    expect(isValidShareCode("x'),or(1")).toBe(false)
    expect(isValidShareCode('ab')).toBe(false)
  })
})
