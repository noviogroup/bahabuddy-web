import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  shareLink: null as null | Record<string, unknown>,
  trip: { name: 'Secret Honeymoon', islands: ['Exuma'] } as Record<string, unknown> | null,
  shareLookups: 0,
}))

function chain(result: unknown) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order']) q[m] = () => q
  q.single = async () => ({ data: result, error: null })
  q.maybeSingle = async () => ({ data: result, error: null })
  return q
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'share_links') {
        mocks.shareLookups += 1
        return chain(mocks.shareLink)
      }
      return chain(mocks.trip)
    },
    rpc: () => Promise.resolve(),
  }),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => { throw new Error('unused') } }))
vi.mock('@/components/marketplace/MarketplacePublicHeader', () => ({ default: () => null }))
vi.mock('@/components/marketplace/CompactPageHeader', () => ({ default: () => null }))
vi.mock('@/components/Footer', () => ({ default: () => null }))

import { generateMetadata } from '@/app/share/[code]/page'

beforeEach(() => {
  mocks.shareLookups = 0
  mocks.trip = { name: 'Secret Honeymoon', islands: ['Exuma'] }
})

describe('share page metadata (F71/F115/F18)', () => {
  test('noindex and generic title for unknown codes', async () => {
    mocks.shareLink = null
    const meta = await generateMetadata({ params: { code: 'abc1234' } })
    expect(meta.robots).toMatchObject({ index: false, follow: false })
    expect(String(meta.title)).not.toContain('Secret Honeymoon')
  })

  test('expired links do not leak the trip name', async () => {
    mocks.shareLink = { trip_id: 't1', share_type: 'link', expires_at: '2020-01-01T00:00:00Z' }
    const meta = await generateMetadata({ params: { code: 'abc1234' } })
    expect(String(meta.title)).toBe('Shared Trip')
    expect(JSON.stringify(meta)).not.toContain('Exuma')
    expect(meta.robots).toMatchObject({ index: false })
  })

  test('valid links are still noindex and do not list islands', async () => {
    mocks.shareLink = { trip_id: 't1', share_type: 'link', expires_at: null }
    const meta = await generateMetadata({ params: { code: 'abc1234' } })
    expect(String(meta.title)).toBe('Secret Honeymoon')
    expect(JSON.stringify(meta)).not.toContain('Exuma')
    expect(meta.robots).toMatchObject({ index: false, follow: false })
  })

  test('malformed codes never hit the database', async () => {
    const meta = await generateMetadata({ params: { code: "x'),or(" } })
    expect(mocks.shareLookups).toBe(0)
    expect(meta.robots).toMatchObject({ index: false })
  })
})
