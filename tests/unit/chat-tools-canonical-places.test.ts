import { describe, expect, it } from 'vitest'

import { CANONICAL_ATTRACTION_NOTE, filterApprovedActivityCards } from '@/lib/approved-activities'
import {
  canonicalInventoryIslandIds,
  executeTool,
  isQualityRestaurantCandidate,
  priceLevelNumber,
} from '@/lib/chat-tools'
import {
  callArgs,
  canonicalPlaceRow,
  createRecordingSupabase,
  hasCall,
  selfTourRow,
} from '../fixtures/recording-supabase'

function restaurantRow(overrides: Record<string, unknown> = {}) {
  return {
    place_id: '55555555-5555-4555-8555-555555555555',
    name: 'Graycliff Restaurant',
    category: 'restaurant',
    type: 'restaurant',
    island_id: 'nassau-paradise-island',
    rating: 4.6,
    review_count: 900,
    user_ratings_total: 900,
    address: 'West Hill St, Nassau',
    phone: null,
    website: null,
    price_level: '$$$$',
    primary_image_url: 'https://images.example/graycliff.jpg',
    photo_url: 'https://images.example/graycliff.jpg',
    gallery_images: [],
    photos: [],
    opening_hours: null,
    description: 'Fine dining in a historic mansion.',
    short_description: null,
    subcategory: 'fine dining restaurant',
    cuisine_type: 'fine dining restaurant',
    ...overrides,
  }
}

function resolveIsland(name: string, params: Record<string, unknown>) {
  if (name === 'resolve_island_slug') {
    const value = String(params.p_value).toLowerCase()
    return { data: value.startsWith('nassau') ? 'nassau-paradise-island' : value, error: null }
  }
  return null
}

describe('web Buddy chat tools read the canonical places catalog', () => {
  it('resolves aliases to the canonical slug stored in places.island_id', () => {
    expect(canonicalInventoryIslandIds('nassau-paradise-island')).toEqual([
      'nassau-paradise-island',
      'nassau',
      'paradise-island',
    ])
    expect(canonicalInventoryIslandIds('nassau')[0]).toBe('nassau-paradise-island')
    expect(canonicalInventoryIslandIds('Harbour Island')[0]).toBe('eleuthera-harbour-island')
    expect(canonicalInventoryIslandIds('bimini')).toEqual(['bimini'])
  })

  it('maps text price levels to card glyphs without inventing a tier', () => {
    expect(priceLevelNumber('$')).toBe(1)
    expect(priceLevelNumber('$$ - $$$')).toBe(3)
    expect(priceLevelNumber('$$$$')).toBe(4)
    expect(priceLevelNumber(2)).toBe(2)
    expect(priceLevelNumber(null)).toBeUndefined()
    expect(priceLevelNumber('')).toBeUndefined()
  })

  it('keeps photo-less restaurants eligible', () => {
    expect(isQualityRestaurantCandidate(restaurantRow({ photo_url: null, photos: [] }))).toBe(true)
    expect(isQualityRestaurantCandidate(restaurantRow({ name: 'KFC Nassau' }))).toBe(false)
  })

  it('get_restaurants queries places for the canonical Nassau slug and returns photo-less rows', async () => {
    const photoLess = restaurantRow({
      place_id: '66666666-6666-4666-8666-666666666666',
      name: 'Arawak Cay Conch Stand',
      price_level: '$$ - $$$',
      primary_image_url: null,
      photo_url: null,
    })
    const unpriced = restaurantRow({
      place_id: '77777777-7777-4777-8777-777777777777',
      name: 'Twin Brothers',
      price_level: null,
    })
    const { client, queries } = createRecordingSupabase({
      rpc: (name, params) => resolveIsland(name, params) ?? { data: [], error: null },
      tables: () => ({ data: [restaurantRow(), photoLess, unpriced], error: null }),
    })

    const result = await executeTool('get_restaurants', { island_id: 'nassau', price_range: 'moderate' }, client, null)

    expect(queries).toHaveLength(1)
    const [query] = queries
    expect(query.table).toBe('places')
    expect(hasCall(query, 'eq', 'is_active', true)).toBe(true)
    expect(hasCall(query, 'eq', 'status', 'active')).toBe(true)
    expect(hasCall(query, 'eq', 'category', 'restaurant')).toBe(true)
    expect(callArgs(query, 'in').find(([column]) => column === 'island_id')?.[1]).toEqual(
      expect.arrayContaining(['nassau-paradise-island']),
    )
    expect(hasCall(query, 'in', 'price_level', ['$$', '$ - $$', '$$ - $$$'])).toBe(true)
    expect(hasCall(query, 'gte', 'latitude', 20)).toBe(true)
    expect(hasCall(query, 'lte', 'longitude', -71)).toBe(true)
    expect(callArgs(query, 'eq').some(([column]) => column === 'recommendation_eligible')).toBe(false)

    const data = result.data as { results: Array<{ name: string; price_level: unknown }>; grounding: { answer_status: string } }
    expect(data.grounding.answer_status).toBe('grounded')
    expect(data.results.map((row) => row.name)).toEqual([
      'Graycliff Restaurant',
      'Arawak Cay Conch Stand',
      'Twin Brothers',
    ])
    expect(data.results[1].price_level).toBe('$$ - $$$')
    const cards = result.cards ?? []
    expect(cards.map((card) => card.name)).toContain('Arawak Cay Conch Stand')
    expect(cards.find((card) => card.name === 'Arawak Cay Conch Stand')).toMatchObject({ price_level: 3, photos: [] })
    expect(cards.find((card) => card.name === 'Twin Brothers')?.price_level).toBeUndefined()
  })

  it('get_activities falls back to canonical attractions with a no-invented-facts note', async () => {
    const attraction = canonicalPlaceRow()
    const beach = canonicalPlaceRow({
      id: '88888888-8888-4888-8888-888888888888',
      slug: 'cabbage-beach',
      name: 'Cabbage Beach',
      subcategory: 'public natural beach',
      primary_image_url: null,
      rating: 4.3,
    })
    const { client, queries } = createRecordingSupabase({
      rpc: (name, params) => resolveIsland(name, params) ?? { data: [selfTourRow()], error: null },
      tables: () => ({ data: [attraction, beach], error: null }),
    })

    const result = await executeTool('get_activities', { island_id: 'nassau' }, client, null)

    const [query] = queries
    expect(query.table).toBe('places')
    expect(hasCall(query, 'eq', 'island_id', 'nassau-paradise-island')).toBe(true)
    expect(hasCall(query, 'gte', 'review_count', 5)).toBe(true)

    const data = result.data as {
      note: string
      exact_island_slug: string
      results: Array<Record<string, unknown>>
      grounding: { answer_status: string; canonical_ids: string[] }
    }
    expect(data.note).toBe(CANONICAL_ATTRACTION_NOTE)
    expect(data.exact_island_slug).toBe('nassau-paradise-island')
    expect(data.grounding.answer_status).toBe('grounded')
    expect(data.results.map((row) => row.name)).toEqual([
      'Fort Fincastle',
      'Cabbage Beach',
      'Nassau / New Providence Historic & Landmark Guided Tour',
    ])
    expect(data.results[0]).toMatchObject({ listing_type: 'canonical_listing', place_id: attraction.id })
    expect(data.results[0]).not.toHaveProperty('price_basis_label')

    // The chat route admits activity cards whose ids came from get_activities.
    const approvedIds = new Set(data.results.map((row) => String(row.place_id)))
    const cards = result.cards ?? []
    expect(filterApprovedActivityCards(cards, approvedIds)).toHaveLength(3)
    expect(cards[0]).not.toHaveProperty('price_basis_label')
    expect(cards[0]).not.toHaveProperty('duration')
  })

  it('get_activities narrows the canonical fallback to the requested vibe and flags unverified kid suitability', async () => {
    const beach = canonicalPlaceRow({
      id: '88888888-8888-4888-8888-888888888888',
      slug: 'cabbage-beach',
      name: 'Cabbage Beach',
      subcategory: 'public natural beach',
    })
    const taxi = canonicalPlaceRow({
      id: '99999999-9999-4999-8999-999999999999',
      slug: 'beach-taxi',
      name: 'Beach Taxi Cab',
      subcategory: 'taxi transfers and private tours',
    })
    const { client, queries } = createRecordingSupabase({
      rpc: (name, params) => resolveIsland(name, params) ?? { data: [], error: null },
      tables: () => ({ data: [taxi, beach], error: null }),
    })

    const result = await executeTool(
      'get_activities',
      { island_id: 'nassau', vibe_tags: ['beach'], kid_friendly: true },
      client,
      null,
    )

    const [query] = queries
    const vibeFilter = callArgs(query, 'or').map(([filter]) => String(filter)).find((filter) => filter.includes('beach'))
    expect(vibeFilter).toContain('subcategory.ilike.%beach%')
    const data = result.data as {
      note: string
      filters_not_applied?: string[]
      results: Array<{ name: string }>
    }
    // Transport services are not activities, even when they match the vibe.
    expect(data.results.map((row) => row.name)).toEqual(['Cabbage Beach'])
    expect(data.filters_not_applied).toEqual(['kid_friendly'])
    expect(data.note).toMatch(/do not describe them as kid-friendly/)
  })

  it('get_activities keeps approved non-tour activities without the canonical fallback', async () => {
    const approvedRow = selfTourRow({ source_layer: 'places', name: 'Approved reef snorkel' })
    const { client, queries } = createRecordingSupabase({
      rpc: (name, params) => resolveIsland(name, params) ?? { data: [approvedRow], error: null },
    })

    const result = await executeTool('get_activities', { island_id: 'nassau' }, client, null)

    expect(queries).toHaveLength(0)
    const data = result.data as { results: Array<{ name: string }>; note?: string }
    expect(data.results.map((row) => row.name)).toEqual(['Approved reef snorkel'])
    expect(data.note).toBeUndefined()
  })
})
