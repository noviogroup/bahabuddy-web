import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import {
  activityBookingLabel,
  activityPriceLabel,
  approvedActivityEmptyMessage,
  canonicalAttractionCard,
  filterApprovedActivityCards,
  getActivitiesWithCanonicalFallback,
  getApprovedActivities,
  type CanonicalAttractionRow,
} from '@/lib/approved-activities'
import {
  callArgs,
  canonicalPlaceRow,
  createRecordingSupabase,
  hasCall,
  selfTourRow,
} from '../fixtures/recording-supabase'

const ISLAND_SLUGS = [
  'abacos',
  'acklins-crooked-island',
  'andros',
  'berry-islands',
  'bimini',
  'cat-island',
  'eleuthera-harbour-island',
  'the-exumas',
  'grand-bahama',
  'inagua',
  'long-island',
  'mayaguana',
  'nassau-paradise-island',
  'ragged-island',
  'rum-cay',
  'san-salvador',
] as const

describe('approved activity traveler contract', () => {
  it('sends exact island/category filters for the 16-island matrix without fallback', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null })
    const supabase = { rpc } as unknown as SupabaseClient

    for (const islandSlug of ISLAND_SLUGS) {
      await getApprovedActivities(supabase, {
        islandSlug,
        category: 'nature',
        limit: 3,
      })
    }

    expect(rpc).toHaveBeenCalledTimes(16)
    ISLAND_SLUGS.forEach((islandSlug, index) => {
      expect(rpc).toHaveBeenNthCalledWith(
        index + 1,
        'get_approved_activity_recommendations',
        expect.objectContaining({
          p_island_slug: islandSlug,
          p_category: 'nature',
          p_limit: 3,
        }),
      )
    })
  })

  it('keeps the four explicit zero-coverage islands honest', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null })
    const supabase = { rpc } as unknown as SupabaseClient

    for (const island of [
      'acklins-crooked-island',
      'berry-islands',
      'mayaguana',
      'ragged-island',
    ]) {
      expect(await getApprovedActivities(supabase, { islandSlug: island })).toEqual([])
      expect(approvedActivityEmptyMessage(island)).toContain("won't substitute another island")
    }
  })

  it('defensively rejects a Nassau row returned for a remote-island request', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        activity_id: 'nassau-only',
        island_slug: 'nassau-paradise-island',
        category_tags: ['culture'],
        name: 'Nassau activity',
        description: 'Must not leak into another island.',
      }],
      error: null,
    })
    const supabase = { rpc } as unknown as SupabaseClient

    expect(await getApprovedActivities(supabase, { islandSlug: 'mayaguana' })).toEqual([])
  })

  it('rejects the regression contaminants and caps Buddy at three approved options', () => {
    const approved = new Set(['approved-1', 'approved-2', 'approved-3', 'approved-4'])
    const cards = [
      { card_type: 'activity', place_id: 'approved-1', name: 'Approved one' },
      { card_type: 'activity', place_id: 'kfc-restaurant', name: 'KFC' },
      { card_type: 'activity', place_id: 'california-coordinate', name: 'Wrong country' },
      { card_type: 'activity', place_id: 'expired-cache', name: 'Expired' },
      { card_type: 'activity', place_id: 'unlocated-self-tour', name: 'No route' },
      { card_type: 'activity', place_id: 'approved-2', name: 'Approved two' },
      { card_type: 'activity', place_id: 'approved-3', name: 'Approved three' },
      { card_type: 'activity', place_id: 'approved-4', name: 'Approved four' },
    ]

    expect(filterApprovedActivityCards(cards, approved)).toEqual([
      cards[0],
      cards[5],
      cards[6],
    ])
  })

  it('labels source-derived pricing and booking state without claiming cached price is live', () => {
    expect(activityPriceLabel({ amount: 95, currency: 'USD', basis: 'per_person', is_from: true }, 'instant_book'))
      .toBe('From USD 95 / per person · verify live')
    expect(activityPriceLabel({ amount: 350, currency: 'USD', basis: 'per_group' }, 'instant_book'))
      .toBe('USD 350 / per group · verify live')
    expect(activityPriceLabel({}, 'request_quote')).toBe('External quote')
    expect(activityPriceLabel({ type: 'free_self_guided' }, 'informational_only')).toBe('Free')
    expect(activityPriceLabel({}, 'informational_only')).toBe('Price N/A')
    expect(approvedActivityEmptyMessage('long-island')).toBe(
      "I don't have activities listed for Long Island yet. I won't substitute another island or an unverified option.",
    )
    expect(activityBookingLabel('instant_book')).toBe('Instant-book · live check required')
  })
})

describe('canonical attraction fallback', () => {
  it('reads active canonical places attractions for the exact island when only self-guided tours are approved', async () => {
    const photoLess = canonicalPlaceRow({
      id: '22222222-2222-4222-8222-222222222222',
      slug: 'blue-lagoon-boat-tour',
      name: 'Blue Lagoon Boat Tour',
      subcategory: 'boat tours and private charters',
      description: 'Boat tour to Blue Lagoon Island.',
      primary_image_url: null,
      rating: 4.9,
    })
    const withPhoto = canonicalPlaceRow({
      id: '33333333-3333-4333-8333-333333333333',
      slug: 'rose-island-boat-tour',
      name: 'Rose Island Boat Tour',
      subcategory: 'boat tours',
      description: 'Boat tour with snorkel stop.',
      rating: 4.5,
    })
    const wrongIsland = canonicalPlaceRow({
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Misfiled Exuma Tour',
      latitude: 23.5,
      longitude: -75.8,
    })
    const { client, queries, rpcCalls } = createRecordingSupabase({
      rpc: () => ({ data: [selfTourRow()], error: null }),
      tables: () => ({ data: [photoLess, withPhoto, wrongIsland], error: null }),
    })

    const result = await getActivitiesWithCanonicalFallback(client, {
      islandSlug: 'nassau',
      search: 'Nassau boat tours',
      limit: 10,
    })

    expect(rpcCalls[0].params).toMatchObject({ p_island_slug: 'nassau-paradise-island' })
    expect(result.approved.map((row) => row.source_layer)).toEqual([])
    expect(queries).toHaveLength(1)
    const [query] = queries
    expect(query.table).toBe('places')
    expect(query.table).not.toBe('v_places_publication_readiness')
    expect(hasCall(query, 'in', 'category', ['attraction', 'activity'])).toBe(true)
    expect(hasCall(query, 'eq', 'is_active', true)).toBe(true)
    expect(hasCall(query, 'eq', 'status', 'active')).toBe(true)
    expect(hasCall(query, 'eq', 'island_id', 'nassau-paradise-island')).toBe(true)
    expect(hasCall(query, 'gte', 'latitude', 20)).toBe(true)
    expect(hasCall(query, 'lte', 'latitude', 28)).toBe(true)
    expect(hasCall(query, 'gte', 'longitude', -80)).toBe(true)
    expect(hasCall(query, 'lte', 'longitude', -71)).toBe(true)
    expect(callArgs(query, 'eq').some(([column]) => column === 'recommendation_eligible')).toBe(false)
    // Island words are stripped; each remaining keyword must match.
    expect(callArgs(query, 'or').map(([filter]) => filter)).toEqual([
      'name.ilike.%boat%,description.ilike.%boat%,short_description.ilike.%boat%,subcategory.ilike.%boat%',
      'name.ilike.%tour%,description.ilike.%tour%,short_description.ilike.%tour%,subcategory.ilike.%tour%',
    ])
    // Photo rows rank first; photo-less rows stay; misfiled coordinates drop.
    expect(result.canonical.map((row) => row.name)).toEqual([
      'Rose Island Boat Tour',
      'Blue Lagoon Boat Tour',
    ])
  })

  it('keeps approved self-guided tours alongside the canonical rows', async () => {
    const { client } = createRecordingSupabase({
      rpc: () => ({ data: [selfTourRow()], error: null }),
      tables: () => ({ data: [canonicalPlaceRow()], error: null }),
    })

    const result = await getActivitiesWithCanonicalFallback(client, { islandSlug: 'nassau-paradise-island' })

    expect(result.approved.map((row) => row.source_layer)).toEqual(['self_tours'])
    expect(result.canonical.map((row) => row.name)).toEqual(['Fort Fincastle'])
  })

  it('does not query canonical places when a non-tour activity is approved', async () => {
    const { client, queries } = createRecordingSupabase({
      rpc: () => ({ data: [selfTourRow({ source_layer: 'places', name: 'Approved snorkel trip' })], error: null }),
    })

    const result = await getActivitiesWithCanonicalFallback(client, { islandSlug: 'nassau-paradise-island' })

    expect(queries).toHaveLength(0)
    expect(result.approved.map((row) => row.name)).toEqual(['Approved snorkel trip'])
    expect(result.canonical).toEqual([])
  })

  it('keeps canonical rows for islands without approved non-tour coverage on island-less reads', async () => {
    const exumaAttraction = canonicalPlaceRow({
      id: '99999999-9999-4999-8999-999999999999',
      slug: 'thunderball-grotto',
      name: 'Thunderball Grotto',
      island_id: 'the-exumas',
      island_name: 'The Exumas',
      latitude: 24.17,
      longitude: -76.45,
    })
    const { client } = createRecordingSupabase({
      rpc: () => ({ data: [selfTourRow({ source_layer: 'places', name: 'Approved snorkel trip' })], error: null }),
      tables: () => ({ data: [canonicalPlaceRow(), exumaAttraction], error: null }),
    })

    const result = await getActivitiesWithCanonicalFallback(client, {})

    expect(result.approved.map((row) => row.name)).toEqual(['Approved snorkel trip'])
    // Nassau has a reviewed offer; the Exumas still shows its real attraction.
    expect(result.canonical.map((row) => row.name)).toEqual(['Thunderball Grotto'])
  })

  it('treats an undeployed approved RPC as empty and still returns canonical rows', async () => {
    const { client } = createRecordingSupabase({
      rpc: () => ({ data: null, error: { message: 'missing function', code: 'PGRST202' } }),
      tables: () => ({ data: [canonicalPlaceRow()], error: null }),
    })

    const result = await getActivitiesWithCanonicalFallback(client, { islandSlug: 'nassau-paradise-island' })

    expect(result.approved).toEqual([])
    expect(result.canonical.map((row) => row.slug)).toEqual(['fort-fincastle'])
  })

  it('looks up a canonical attraction by id and rejects non-uuid ids without querying', async () => {
    const row = canonicalPlaceRow()
    const { client, queries } = createRecordingSupabase({
      rpc: () => ({ data: [], error: null }),
      tables: () => ({ data: [row], error: null }),
    })

    const byId = await getActivitiesWithCanonicalFallback(client, { activityId: row.id, limit: 1 })
    expect(byId.canonical.map((candidate) => candidate.id)).toEqual([row.id])
    expect(hasCall(queries[0], 'eq', 'id', row.id)).toBe(true)

    const bySlug = await getActivitiesWithCanonicalFallback(client, { activityId: 'fort-fincastle' })
    expect(bySlug).toEqual({ approved: [], canonical: [] })
    expect(queries).toHaveLength(1)
  })

  it('builds catalog-only cards with no invented price, duration or availability', () => {
    const card = canonicalAttractionCard(canonicalPlaceRow({ primary_image_url: null }) as unknown as CanonicalAttractionRow)

    expect(card).toMatchObject({
      card_type: 'activity',
      place_id: '11111111-1111-4111-8111-111111111111',
      name: 'Fort Fincastle',
      island_id: 'nassau-paradise-island',
      vibe_tags: ['culture'],
      photos: [],
    })
    expect(card.photo_url).toBeUndefined()
    for (const key of ['price_basis_label', 'duration', 'duration_label', 'booking_state_label', 'live_availability_state']) {
      expect(card).not.toHaveProperty(key)
    }
    expect(filterApprovedActivityCards([card], new Set([card.place_id]))).toEqual([card])
  })
})
