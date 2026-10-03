import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/public', () => ({
  createPublicClient: vi.fn(),
}))

import {
  HOME_TOP_PICKS_FETCH_LIMIT,
  getHomeTopPicks,
  topPickCategoryLabel,
  topPickRowsToExperiences,
  type TopPickRow,
} from '@/lib/top-picks'

function row(overrides: Partial<TopPickRow>): TopPickRow {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    slug: 'ardastra-gardens',
    name: 'Ardastra Gardens',
    category: 'attraction',
    subcategory: 'zoo and tropical gardens',
    island_id: 'nassau-paradise-island',
    island_name: 'Nassau & Paradise Island',
    latitude: 25.0718,
    longitude: -77.3659,
    primary_image_url: 'https://media-cdn.tripadvisor.com/media/photo-o/ardastra.jpg',
    gallery_images: [],
    metadata: { image_attribution: 'Photo: Tripadvisor' },
    ...overrides,
  }
}

/** Minimal PostgREST builder: records orders, fails when a rejected column is ordered. */
function fakeSupabase(rows: TopPickRow[], options: { missingRank?: boolean; fail?: boolean } = {}) {
  const orders: string[][] = []
  const limits: number[] = []
  const from = vi.fn(() => {
    const current: string[] = []
    orders.push(current)
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'in', 'gte', 'lte']) builder[method] = () => builder
    builder.order = (column: string) => {
      current.push(column)
      return builder
    }
    builder.limit = async (count: number) => {
      limits.push(count)
      if (options.fail) return { data: null, error: { message: 'boom' } }
      if (options.missingRank && current.includes('featured_rank')) {
        return { data: null, error: { message: 'column places.featured_rank does not exist' } }
      }
      return { data: rows, error: null }
    }
    return builder
  })
  return { client: { from } as unknown as SupabaseClient, orders, limits }
}

describe('getHomeTopPicks', () => {
  it('maps featured places to image-first carousel cards linking to the place detail page', async () => {
    const { client, orders } = fakeSupabase([
      row({}),
      row({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', slug: null, name: 'No Photo', primary_image_url: null }),
      row({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', slug: null, name: 'Pink Sand Beach', category: 'beach', subcategory: null, island_name: null, island_id: 'eleuthera-harbour-island', latitude: 25.5, longitude: -76.63, metadata: null }),
    ])

    const picks = await getHomeTopPicks(client)

    expect(orders[0]).toEqual(['featured_rank', 'rating', 'review_count'])
    expect(picks).toEqual([
      {
        title: 'Ardastra Gardens',
        island: 'Nassau & Paradise Island',
        category: 'Zoo',
        href: '/explore/places/ardastra-gardens',
        image: 'https://media-cdn.tripadvisor.com/media/photo-o/ardastra.jpg',
        badge: 'Top pick',
        attribution: 'Photo: Tripadvisor',
      },
      expect.objectContaining({
        title: 'Pink Sand Beach',
        category: 'Beach',
        href: '/explore/places/cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        badge: 'Top pick',
      }),
    ])
    expect(picks[1]).not.toHaveProperty('attribution')
  })

  it('retries without featured_rank when the column is not deployed yet', async () => {
    const { client, orders } = fakeSupabase([row({})], { missingRank: true })

    const picks = await getHomeTopPicks(client)

    expect(orders).toEqual([
      ['featured_rank', 'rating', 'review_count'],
      ['rating', 'review_count'],
    ])
    expect(picks).toHaveLength(1)
  })

  it('returns an empty list instead of throwing when the catalog is unavailable', async () => {
    const { client } = fakeSupabase([], { fail: true })
    await expect(getHomeTopPicks(client)).resolves.toEqual([])

    const throwing = { from: () => { throw new Error('offline') } } as unknown as SupabaseClient
    await expect(getHomeTopPicks(throwing)).resolves.toEqual([])
  })
})

describe('topPickCategoryLabel', () => {
  it('keeps category labels short and title-cased', () => {
    expect(topPickCategoryLabel({ category: 'attraction', subcategory: 'resort water park' })).toBe('Resort Water Park')
    expect(topPickCategoryLabel({ category: 'attraction', subcategory: 'waterfront shopping and dining village' })).toBe('Waterfront Shopping')
    expect(topPickCategoryLabel({ category: 'activity', subcategory: 'scuba_diving' })).toBe('Scuba Diving')
    expect(topPickCategoryLabel({ category: 'landmark', subcategory: null })).toBe('Landmark')
    expect(topPickCategoryLabel({ category: 'attraction', subcategory: 'marine park of the exuma cays' })).toBe('Marine Park')
  })
})

describe('top pick personalization fields', () => {
  it('fetches extra picks so the client can re-rank to the 12 shown', async () => {
    const { client, limits } = fakeSupabase([row({})])
    await getHomeTopPicks(client)
    expect(HOME_TOP_PICKS_FETCH_LIMIT).toBe(24)
    expect(limits).toEqual([24])
  })

  it('carries trip styles, price tier and a temporarily-closed flag, and skips closed-for-good places', () => {
    const picks = topPickRowsToExperiences([
      row({ trip_styles: ['family', 'bogus', 'beach-fun'], price_tier: 'mid' }),
      row({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', slug: 'closed-fort', name: 'Closed Fort', business_status: 'CLOSED_PERMANENTLY' }),
      row({ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', slug: 'paused-garden', name: 'Paused Garden', business_status: 'CLOSED_TEMPORARILY', price_tier: 'nope', trip_styles: [] }),
    ])

    expect(picks.map((pick) => pick.title)).toEqual(['Ardastra Gardens', 'Paused Garden'])
    expect(picks[0]).toMatchObject({ tripStyles: ['beach-fun', 'family'], priceTier: 'mid' })
    expect(picks[0]).not.toHaveProperty('temporarilyClosed')
    expect(picks[1]).toMatchObject({ temporarilyClosed: true })
    expect(picks[1]).not.toHaveProperty('tripStyles')
    expect(picks[1]).not.toHaveProperty('priceTier')
  })
})
