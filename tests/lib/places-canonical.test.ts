import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  callArgs,
  canonicalPlaceRow,
  createRecordingSupabase,
  hasCall,
  selfTourRow,
  type RecordedQuery,
} from '../fixtures/recording-supabase'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

// Public catalog reads use the cookie-free client; route them to the same
// mock client the test configures for the cookie client.
vi.mock('@/lib/supabase/public', async () => {
  const { deferredSupabaseClient } = await import('../fixtures/deferred-supabase')
  return { createPublicClient: () => deferredSupabaseClient(() => supabaseMocks.createClient()) }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: supabaseMocks.createClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => null,
}))

import { getExplorePlaceById, getExplorePlaces, getPublishedRestaurants } from '@/lib/places'

const restaurantWithPhoto = canonicalPlaceRow({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  slug: 'graycliff',
  name: 'Graycliff Restaurant',
  category: 'restaurant',
  subcategory: 'fine dining restaurant',
  rating: 4.6,
  price_level: '$$$$',
})
const restaurantWithoutPhoto = canonicalPlaceRow({
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  slug: 'arawak-cay-conch-stand',
  name: 'Arawak Cay Conch Stand',
  category: 'restaurant',
  subcategory: 'Bahamian seafood restaurant',
  primary_image_url: null,
  rating: 4.8,
  price_level: '$$ - $$$',
})
const exumaRestaurant = canonicalPlaceRow({
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  slug: 'chat-n-chill',
  name: 'Chat N Chill',
  category: 'restaurant',
  island_id: 'the-exumas',
  island_name: 'The Exumas',
  latitude: 23.51,
  longitude: -75.76,
})
const beachBar = canonicalPlaceRow({
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  slug: 'twin-brothers',
  name: 'Twin Brothers',
  category: 'restaurant',
  subcategory: 'beach bar and grill',
  rating: 4.2,
})
const beachfrontHotel = canonicalPlaceRow({
  id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  slug: 'coral-villas',
  name: 'Coral Villas',
  category: 'hotel',
  subcategory: 'beachfront villa resort',
  rating: 4.1,
})
const beach = canonicalPlaceRow({
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  slug: 'cabbage-beach',
  name: 'Cabbage Beach',
  subcategory: 'public natural beach',
})

function isAttractionQuery(query: RecordedQuery) {
  return hasCall(query, 'in', 'category', ['attraction', 'activity'])
}

describe('public catalog reads canonical places rows', () => {
  let queries: RecordedQuery[]

  beforeEach(() => {
    const mock = createRecordingSupabase({
      rpc: () => ({ data: [selfTourRow()], error: null }),
      tables: (query) => {
        // Rating order from the database: the photo-less row is rated higher.
        const rows: Array<Record<string, unknown>> = isAttractionQuery(query)
          ? [beach]
          : [restaurantWithoutPhoto, restaurantWithPhoto, exumaRestaurant, beachBar, beachfrontHotel, beach]
        const exact = callArgs(query, 'eq').filter(([column]) => column === 'slug' || column === 'id')
        return {
          data: rows.filter((row) => exact.every(([column, value]) => row[String(column)] === value)),
          error: null,
        }
      },
    })
    queries = mock.queries
    supabaseMocks.createClient.mockResolvedValue(mock.client)
  })

  it('lists island restaurants from places with the active and coordinate gates', async () => {
    const restaurants = await getPublishedRestaurants({ island: 'Nassau & Paradise Island' })

    const listQuery = queries.find((query) => !isAttractionQuery(query))
    expect(listQuery?.table).toBe('places')
    expect(queries.some((query) => query.table === 'v_places_publication_readiness')).toBe(false)
    expect(hasCall(listQuery!, 'eq', 'is_active', true)).toBe(true)
    expect(hasCall(listQuery!, 'eq', 'status', 'active')).toBe(true)
    expect(hasCall(listQuery!, 'gte', 'latitude', 20)).toBe(true)
    expect(hasCall(listQuery!, 'lte', 'latitude', 28)).toBe(true)
    expect(hasCall(listQuery!, 'gte', 'longitude', -80)).toBe(true)
    expect(hasCall(listQuery!, 'lte', 'longitude', -71)).toBe(true)
    expect(listQuery!.calls.some((call) => call.args[0] === 'recommendation_eligible')).toBe(false)

    // Photo rows rank first; photo-less rows are still listed.
    expect(restaurants.map((place) => place.name)).toEqual([
      'Graycliff Restaurant',
      'Twin Brothers',
      'Arawak Cay Conch Stand',
    ])
    expect(restaurants[2]).toMatchObject({ image_url: null, price_range: '$$ - $$$', category: 'Dining' })
  })

  it('adds canonical attractions to explore when only self-guided tours are approved', async () => {
    const places = await getExplorePlaces()

    const attraction = places.find((place) => place.name === 'Cabbage Beach')
    expect(attraction).toMatchObject({
      source_type: 'canonical_attraction',
      category: 'Beach',
      detail_href: '/explore/places/cabbage-beach',
      price_range: null,
    })
    expect(attraction?.duration_label).toBeUndefined()
    expect(places.some((place) => place.source_type === 'approved_activity')).toBe(true)
    expect(places.filter((place) => place.name === 'Cabbage Beach')).toHaveLength(1)
    // The canonical category decides: beach-themed venues keep their type.
    expect(places.find((place) => place.name === 'Twin Brothers')).toMatchObject({
      source_type: 'canonical',
      category: 'Dining',
    })
    expect(places.find((place) => place.name === 'Coral Villas')).toMatchObject({
      source_type: 'canonical',
      category: 'Hotel',
    })
  })

  it('resolves a canonical attraction detail page by slug', async () => {
    const place = await getExplorePlaceById('cabbage-beach')

    expect(place).toMatchObject({ name: 'Cabbage Beach', source_type: 'canonical_attraction' })
    const detailQuery = queries.find((query) => hasCall(query, 'eq', 'slug', 'cabbage-beach'))
    expect(detailQuery?.table).toBe('places')
  })
})
