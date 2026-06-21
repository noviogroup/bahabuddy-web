import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import BuddyPickCard, { BUDDY_PICK_FALLBACKS } from '@/components/home/BuddyPickCard'
import QuickActionsRow from '@/components/home/QuickActionsRow'
import { fetchFeaturedArticles } from '@/lib/sanity/queries'

vi.mock('@/lib/sanity/queries', () => ({
  fetchFeaturedArticles: vi.fn(),
}))

const mockedFetchFeaturedArticles = vi.mocked(fetchFeaturedArticles)

describe('BuddyPickCard direct actions', () => {
  beforeEach(() => {
    mockedFetchFeaturedArticles.mockReset()
  })

  test('hardcoded fallback picks use direct surfaces instead of chat prompts', () => {
    expect(BUDDY_PICK_FALLBACKS).toHaveLength(4)

    for (const pick of BUDDY_PICK_FALLBACKS) {
      expect(pick.href).not.toContain('/dashboard/chat')
      expect(pick.href).not.toContain('q=')
      expect(pick.ctaLabel).toMatch(/\S/)
    }

    expect(BUDDY_PICK_FALLBACKS.map((pick) => pick.href)).toEqual([
      '/explore/places?island=nassau-paradise-island&search=sunset+sailing+Nassau+Harbor&category=Water+Activity',
      '/explore/places?island=the-exumas&search=swimming+pigs+Big+Major+Cay&category=Activity',
      '/explore/places?island=eleuthera-harbour-island&search=pink+sand+beach&category=Beach',
      '/dashboard/trips/new?source=buddy_pick&destination=bimini&seed=Bimini+day+trip+from+Miami+with+transportation%2C+beach+time%2C+food%2C+and+a+realistic+return+plan.',
    ])
  })

  test('rendered fallback card does not send the dashboard user into chat', async () => {
    mockedFetchFeaturedArticles.mockResolvedValue(null)

    render(await BuddyPickCard())

    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).not.toContain('/dashboard/chat')
    expect(screen.queryByText('Start with Buddy')).not.toBeInTheDocument()
  })

  test('featured Sanity articles continue to open article details', async () => {
    mockedFetchFeaturedArticles.mockResolvedValue([
      {
        _id: 'article-1',
        slug: 'exuma-weekend-guide',
        title: 'Exuma weekend guide',
        excerpt: 'A tight island plan with the right pace.',
        category: 'travel_guide',
        imageUrl: null,
        readTimeMinutes: 5,
        publishedAt: '2026-06-20T00:00:00.000Z',
        featured: true,
      },
    ])

    render(await BuddyPickCard())

    expect(screen.getByRole('link')).toHaveAttribute('href', '/explore/articles/exuma-weekend-guide')
    expect(screen.getByText('Read guide')).toBeInTheDocument()
  })
})

describe('QuickActionsRow direct actions', () => {
  test('dormant quick actions are safe to reintroduce without chat-first routes', () => {
    render(<QuickActionsRow />)

    expect(screen.getByRole('link', { name: /New Trip/i })).toHaveAttribute(
      'href',
      '/dashboard/trips/new?source=quick_action',
    )
    expect(screen.getByRole('link', { name: /Flights/i })).toHaveAttribute(
      'href',
      '/flights?destination=NAS&tripType=round_trip&passengers=1&cabin=economy',
    )
    expect(screen.getByRole('link', { name: /Hotels/i })).toHaveAttribute('href', '/stays?sort=stars')
    expect(screen.getByRole('link', { name: /Things to Do/i })).toHaveAttribute(
      'href',
      '/explore/places?search=things+to+do&category=Activity',
    )

    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href')).not.toContain('/dashboard/chat')
    }
  })
})
