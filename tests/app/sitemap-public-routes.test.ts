import { beforeEach, describe, expect, test, vi } from 'vitest'
import sitemap from '@/app/sitemap'
import { ISLAND_CONFIGS } from '@/lib/island-config'

const sanityMocks = vi.hoisted(() => ({
  fetchAllArticleSlugs: vi.fn(),
}))

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/sanity/queries', () => ({
  fetchAllArticleSlugs: sanityMocks.fetchAllArticleSlugs,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: supabaseMocks.createClient,
}))

describe('public sitemap routes', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bahabuddy.test'
    sanityMocks.fetchAllArticleSlugs.mockResolvedValue(['ultimate-nassau-guide'])
    supabaseMocks.createClient.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: [{ id: 'place-123' }],
            error: null,
          })),
        })),
      })),
    })
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

    expect(urls).toContain('https://bahabuddy.test/explore/places/place-123')
    expect(urls).toContain('https://bahabuddy.test/guides/ultimate-nassau-guide')
    expect(urls).not.toContain('https://bahabuddy.test/dashboard')
    expect(urls).not.toContain('https://bahabuddy.test/profile')
  })
})
