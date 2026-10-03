import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { GET } from '@/app/api/search/catalog/route'
import { canonicalPlaceRow, createRecordingSupabase, hasCall, selfTourRow } from '../fixtures/recording-supabase'

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
    const activityId = '24600000-0000-4000-8000-000000000001'
    supabaseMocks.rpc.mockImplementation(async (name: string) => ({
      data: name === 'get_approved_activity_recommendations' ? [{
        activity_id: activityId,
        place_id: null,
        source_layer: 'places',
        source_record_id: 'pink-sands-source',
        name: 'Pink Sands Beach',
        island_slug: 'eleuthera-harbour-island',
        category_tags: ['beach'],
        description: 'Harbour Island',
        location_model: 'exact_point',
        latitude: 25.5,
        longitude: -76.6,
        location_notes: null,
        contact: {},
        seasonality: {},
        safety_access: {},
        price_basis: {},
        booking_quote_state: 'informational_only',
        cancellation: {},
        media: {},
        duration: null,
        meeting_pickup: null,
        group_age_limits: null,
        source_checked_at: '2026-09-26T00:00:00Z',
        source_recheck_at: '2026-10-26T00:00:00Z',
        source_owner: 'Baha Buddy',
        source_class: 'official',
        source_url: 'https://example.invalid/pink-sands',
        live_availability_state: 'requires_live_check',
      }] : [{
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
    }))

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
    expect(supabaseMocks.rpc).toHaveBeenCalledWith('get_approved_activity_recommendations', expect.objectContaining({
      p_island_slug: 'eleuthera-harbour-island',
      p_category: 'beach',
      p_limit: 48,
    }))
    expect(response.status).toBe(200)
    expect(body.count).toBe(1)
    expect(body.results[0]).toMatchObject({
      id: activityId,
      type: 'attraction',
      href: `/explore/activities/${activityId}`,
      islandName: 'Eleuthera',
    })
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('cache-control')).not.toContain('s-maxage')
  })

  test('adds real canonical attractions when only self-guided tours are approved', async () => {
    const beach = canonicalPlaceRow({
      id: '99999999-9999-4999-8999-999999999999',
      slug: 'cabbage-beach',
      name: 'Cabbage Beach',
      subcategory: 'public natural beach',
      description: 'Long beach on Paradise Island.',
      short_description: null,
      primary_image_url: null,
    })
    const { client, queries } = createRecordingSupabase({
      rpc: (name) => ({ data: name === 'search_catalog' ? [] : [selfTourRow()], error: null }),
      tables: () => ({ data: [beach], error: null }),
    })
    supabaseMocks.createClient.mockResolvedValue(client)

    const response = await GET(new NextRequest(
      'https://bahabuddy.test/api/search/catalog?q=nassau%20beach&filter=things_to_do&island=nassau-paradise-island',
    ))
    const body = await response.json()

    expect(queries[0].table).toBe('places')
    expect(hasCall(queries[0], 'eq', 'island_id', 'nassau-paradise-island')).toBe(true)
    expect(body.results).toEqual([
      expect.objectContaining({
        id: beach.id,
        type: 'attraction',
        title: 'Cabbage Beach',
        category: 'Beach',
        priceFromUsd: null,
        href: `/explore/places/${beach.id}`,
      }),
    ])
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
