import { beforeEach, describe, expect, test, vi } from 'vitest'
import sitemap from '@/app/sitemap'
import { ISLAND_CONFIGS } from '@/lib/island-config'
import { canonicalPlaceRow, createRecordingSupabase } from '../fixtures/recording-supabase'

const sanityMocks = vi.hoisted(() => ({
  fetchAllArticleSlugs: vi.fn(),
}))

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/sanity/queries', () => ({
  fetchAllArticleSlugs: sanityMocks.fetchAllArticleSlugs,
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

describe('public sitemap routes', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bahabuddy.test'
    sanityMocks.fetchAllArticleSlugs.mockResolvedValue(['ultimate-nassau-guide'])
    const { client } = createRecordingSupabase({
      rpc: () => ({
        data: [{
          activity_id: '24600000-0000-4000-8000-000000000123',
          source_layer: 'places',
          island_slug: 'the-exumas',
          category_tags: ['adventure'],
          name: 'Exuma Cays Boat Tour',
          description: 'A guided boat day across the Exuma cays.',
        }],
        error: null,
      }),
      tables: () => ({
        data: [canonicalPlaceRow({ slug: 'graycliff', name: 'Graycliff Restaurant', category: 'restaurant' })],
        error: null,
      }),
    })
    supabaseMocks.createClient.mockResolvedValue(client)
  })

  test('includes public marketplace, utility, content, and canonical island detail routes', async () => {
    const entries = await sitemap()
    const urls = entries.map((entry) => entry.url)

    const expectedStaticRoutes = [
      '',
      '/search',
      '/stays',
      '/flights',
      '/explore',
      '/explore/places',
      '/destinations',
      '/guides',
      '/nassau-cruise-itineraries',
      '/nassau-cruise-day-planner',
      '/build-my-cruise-day',
      '/deals',
      '/restaurants',
      '/concierge-trip-plan',
      '/partners',
      '/tourism-board-partnerships',
      '/list-your-property',
      '/about',
      '/how-it-works',
      '/help',
      '/contact',
      '/privacy',
      '/terms',
      '/accessibility',
    ]

    expectedStaticRoutes.forEach((path) => {
      expect(urls).toContain(`https://bahabuddy.test${path}`)
    })

    ISLAND_CONFIGS.forEach((island) => {
      expect(urls).toContain(`https://bahabuddy.test/explore/island/${island.slug}`)
    })

    // Activity details are listed at the public route; the dashboard copy at
    // /activities/[id] redirects anonymous crawlers to /login.
    expect(urls).toContain('https://bahabuddy.test/explore/activities/24600000-0000-4000-8000-000000000123')
    expect(urls).not.toContain('https://bahabuddy.test/activities/24600000-0000-4000-8000-000000000123')
    // Canonical catalog detail pages are listed too.
    expect(urls).toContain('https://bahabuddy.test/explore/places/graycliff')
    expect(urls).toContain('https://bahabuddy.test/guides/ultimate-nassau-guide')
    expect(urls).not.toContain('https://bahabuddy.test/dashboard')
    expect(urls).not.toContain('https://bahabuddy.test/profile')
  })
})
