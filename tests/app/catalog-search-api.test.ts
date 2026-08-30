import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { GET } from '@/app/api/search/catalog/route'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: supabaseMocks.createClient,
}))

describe('GET /api/search/catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMocks.createClient.mockResolvedValue({ rpc: supabaseMocks.rpc })
  })

  test('does not query the database for a one-character search', async () => {
    const response = await GET(new NextRequest('https://bahabuddy.test/api/search/catalog?q=p'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ query: 'p', results: [], count: 0 })
    expect(supabaseMocks.rpc).not.toHaveBeenCalled()
  })

  test('passes bounded, validated parameters to the catalog RPC', async () => {
    supabaseMocks.rpc.mockResolvedValue({
      data: [{
        result_id: 'pink-sands',
        result_type: 'attraction',
        title: 'Pink Sands Beach',
        subtitle: 'Harbour Island',
        island_slug: 'eleuthera-harbour-island',
        island_name: 'Eleuthera & Harbour Island',
        category: 'Beach',
        image_url: null,
        rating: 4.8,
        review_count: 920,
        price_from_usd: null,
        route_path: '/places/pink-sands',
        source_table: 'bahamas_attractions',
        score: 88,
        is_live_action: false,
      }],
      error: null,
    })

    const response = await GET(new NextRequest(
      'https://bahabuddy.test/api/search/catalog?q=%20pink%20%20sand%20&filter=beaches&island=eleuthera-harbour-island&limit=500',
    ))
    const body = await response.json()

    expect(supabaseMocks.rpc).toHaveBeenCalledWith('search_catalog', {
      p_query: 'pink sand',
      p_filter: 'beaches',
      p_island: 'eleuthera-harbour-island',
      p_limit: 48,
    })
    expect(response.status).toBe(200)
    expect(body.count).toBe(1)
    expect(body.results[0]).toMatchObject({
      id: 'pink-sands',
      type: 'attraction',
      href: '/explore/places/pink-sands',
    })
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('cache-control')).not.toContain('s-maxage')
  })

  test('returns a safe temporary failure without exposing provider details', async () => {
    supabaseMocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', details: 'internal database details' },
    })

    const response = await GET(new NextRequest(
      'https://bahabuddy.test/api/search/catalog?q=snorkeling',
    ))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({
      error: 'Search is temporarily unavailable. Please try again.',
    })
    expect(JSON.stringify(body)).not.toContain('internal database details')
  })
})
