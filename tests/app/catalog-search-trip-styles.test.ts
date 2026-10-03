import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { GET } from '@/app/api/search/catalog/route'
import { canonicalPlaceRow, createRecordingSupabase, selfTourRow } from '../fixtures/recording-supabase'

const supabaseMocks = vi.hoisted(() => ({ createClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({ createClient: supabaseMocks.createClient }))

const placeRow = {
  result_id: 'cabbage-beach',
  result_type: 'place',
  title: 'Cabbage Beach Bar',
  subtitle: 'Paradise Island',
  island_slug: 'nassau-paradise-island',
  island_name: 'Nassau & Paradise Island',
  category: 'Dining',
  image_url: null,
  rating: 4.5,
  review_count: 300,
  price_from_usd: null,
  route_path: '/explore/places/cabbage-beach-bar',
  source_table: 'places',
  score: 80,
  is_live_action: false,
}

const BASE_ARGS = {
  p_query: 'nassau dinner',
  p_filter: 'food',
  p_island: null,
  p_limit: 36,
}

function searchCalls(rpcCalls: Array<{ name: string; params: Record<string, unknown> }>) {
  return rpcCalls.filter((call) => call.name === 'search_catalog').map((call) => call.params)
}

describe('GET /api/search/catalog trip styles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('passes valid styles to the RPC as p_trip_styles', async () => {
    const { client, rpcCalls } = createRecordingSupabase({
      rpc: () => ({ data: [placeRow], error: null }),
    })
    supabaseMocks.createClient.mockResolvedValue(client)

    const response = await GET(new NextRequest(
      'https://bahabuddy.test/api/search/catalog?q=nassau%20dinner&filter=food&styles=romance,bogus,luxury',
    ))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(searchCalls(rpcCalls)).toEqual([{ ...BASE_ARGS, p_trip_styles: ['luxury', 'romance'] }])
    expect(body.results.map((result: { id: string }) => result.id)).toEqual(['cabbage-beach'])
  })

  test('falls back to the 4-argument call when the RPC rejects p_trip_styles', async () => {
    const { client, rpcCalls } = createRecordingSupabase({
      rpc: (_name, params) => 'p_trip_styles' in params
        ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.search_catalog(p_filter, p_island, p_limit, p_query, p_trip_styles)' } }
        : { data: [placeRow], error: null },
    })
    supabaseMocks.createClient.mockResolvedValue(client)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const response = await GET(new NextRequest(
      'https://bahabuddy.test/api/search/catalog?q=nassau%20dinner&filter=food&styles=family',
    ))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(searchCalls(rpcCalls)).toEqual([
      { ...BASE_ARGS, p_trip_styles: ['family'] },
      BASE_ARGS,
    ])
    expect(body.count).toBe(1)
    warn.mockRestore()
  })

  test('keeps the original single 4-argument call without (valid) styles', async () => {
    const { client, rpcCalls } = createRecordingSupabase({
      rpc: () => ({ data: [placeRow], error: null }),
    })
    supabaseMocks.createClient.mockResolvedValue(client)

    await GET(new NextRequest('https://bahabuddy.test/api/search/catalog?q=nassau%20dinner&filter=food'))
    await GET(new NextRequest('https://bahabuddy.test/api/search/catalog?q=nassau%20dinner&filter=food&styles=nope'))

    expect(searchCalls(rpcCalls)).toEqual([BASE_ARGS, BASE_ARGS])
  })

  test('still fails safely when the fallback call fails too', async () => {
    const { client } = createRecordingSupabase({
      rpc: (name) => name === 'search_catalog'
        ? { data: null, error: { code: 'XX000', message: 'down' } }
        : { data: [], error: null },
    })
    supabaseMocks.createClient.mockResolvedValue(client)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await GET(new NextRequest(
      'https://bahabuddy.test/api/search/catalog?q=nassau%20dinner&styles=family',
    ))

    expect(response.status).toBe(503)
    vi.restoreAllMocks()
  })

  test('ranks canonical attractions that fit the styles first and drops closed ones', async () => {
    const fort = canonicalPlaceRow({ trip_styles: ['food-culture'] })
    const reef = canonicalPlaceRow({
      id: '22222222-2222-4222-8222-222222222222',
      slug: 'reef-snorkel',
      name: 'Reef Snorkel Spot',
      trip_styles: ['adventure'],
    })
    const closed = canonicalPlaceRow({
      id: '33333333-3333-4333-8333-333333333333',
      slug: 'old-pier',
      name: 'Old Pier',
      trip_styles: ['adventure'],
      business_status: 'CLOSED_PERMANENTLY',
    })
    const { client } = createRecordingSupabase({
      rpc: (name) => ({ data: name === 'search_catalog' ? [] : [selfTourRow()], error: null }),
      tables: () => ({ data: [fort, reef, closed], error: null }),
    })
    supabaseMocks.createClient.mockResolvedValue(client)

    const response = await GET(new NextRequest(
      'https://bahabuddy.test/api/search/catalog?q=nassau&filter=things_to_do&island=nassau-paradise-island&styles=adventure',
    ))
    const body = await response.json()

    // Reviewed (approved) rows keep their place; canonical rows are re-ranked.
    const canonicalTitles = (body.results as Array<{ title: string; href: string }>)
      .filter((result) => result.href.startsWith('/explore/places/'))
      .map((result) => result.title)
    expect(canonicalTitles).toEqual(['Reef Snorkel Spot', 'Fort Fincastle'])
  })
})
