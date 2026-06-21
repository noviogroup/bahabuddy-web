import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import DealsPage from '@/app/deals/page'
import DestinationsPage from '@/app/destinations/page'
import GuidesPage from '@/app/guides/page'

type QueryResult = {
  data: unknown[] | null
  error: null
}

const sanityMocks = vi.hoisted(() => ({
  fetchArticles: vi.fn(),
}))

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/sanity/queries', () => ({
  fetchArticles: sanityMocks.fetchArticles,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: supabaseMocks.createClient,
}))

vi.mock('@/components/Footer', () => ({
  default: () => <footer>Marketplace footer</footer>,
}))

vi.mock('@/components/ChatWidget', () => ({
  default: () => null,
}))

vi.mock('@/components/TrackView', () => ({
  default: () => null,
}))

class MockSupabaseQuery {
  constructor(private readonly result: QueryResult) {}

  select = vi.fn(() => this)
  eq = vi.fn(() => this)
  order = vi.fn(() => this)
  limit = vi.fn(() => this)

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }
}

function expectNoColoredMarketplaceChrome(container: HTMLElement) {
  expect(container.innerHTML).not.toMatch(/border-sand|bg-sand|ring-sand|bg-offwhite/)
  expect(container.innerHTML).not.toMatch(/border-gold|ring-gold/)
}

describe('public marketplace editorial pages neutral layout', () => {
  beforeEach(() => {
    supabaseMocks.createClient.mockResolvedValue({
      from: (table: string) => new MockSupabaseQuery({
        data: table === 'bahamas_deals'
          ? [{
              id: 'deal-tour-1',
              title: 'Exuma Sandbar Day Tour',
              deal_type: 'tour',
              island: 'exuma',
              resort_name: null,
              description: 'A guided boat day across Exuma sandbars with snorkeling stops.',
              price_from_usd: 149,
              price_unit: 'per_person',
              image_url: null,
              highlights: ['Boat day', 'Snorkeling', 'Sandbars'],
              tags: ['Tour'],
              valid_through: null,
            }]
          : [{
              id: 'destination-beach-1',
              name: 'Cabbage Beach',
              category: 'Beach',
              island: 'Paradise Island',
              description: 'Wide white-sand beach close to Nassau resorts.',
              image_url: null,
              tags: ['Beach', 'Resorts', 'Swimming'],
            }],
        error: null,
      }),
    })

    sanityMocks.fetchArticles.mockResolvedValue([
      {
        _id: 'guide-1',
        slug: 'nassau-food-guide',
        title: 'Nassau food guide',
        excerpt: 'Where to eat well around Nassau without wasting a meal.',
        category: 'food_dining',
        imageUrl: null,
        readTimeMinutes: 6,
        publishedAt: null,
        featured: true,
      },
    ])
  })

  test('deals page keeps cards, filters, royal-blue CTAs, and yellow accents', async () => {
    const page = await DealsPage({ searchParams: { type: 'tour' } })
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: 'Bahamas Deals & Packages' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse stays' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Browse stays' }).querySelector('.bg-gold-400')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View experiences' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'View experiences' }).querySelector('.bg-gold-400')).toBeInTheDocument()
    expect(screen.getAllByText('Exuma Sandbar Day Tour')[0].closest('.group')).toHaveClass('border-gray-200')
    expect(screen.getAllByRole('link', { name: 'Ask Buddy' })[0]).toHaveClass('border-gray-300')
    expect(container.innerHTML).not.toMatch(/bg-night/)
    expectNoColoredMarketplaceChrome(container)
  })

  test('destinations page keeps neutral cards with brand primary actions and gold accents', async () => {
    const page = await DestinationsPage({ searchParams: { category: 'Beach', island: 'Paradise Island' } })
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: 'Discover Paradise Island' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Explore' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Open Explore' }).querySelector('.bg-gold-400')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute(
      'href',
      '/explore/places/destination-beach-1',
    )
    expect(screen.getByRole('link', { name: 'Add to trip' })).toHaveAttribute(
      'href',
      '/explore/places/destination-beach-1#trip-actions',
    )
    expect(screen.getByRole('link', { name: 'Add to trip' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Add to trip' }).querySelector('.bg-gold-400')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore places' })).toHaveAttribute(
      'href',
      '/explore/places?island=Paradise+Island&category=Beach',
    )
    expect(screen.getAllByRole('link', { name: 'Ask Buddy' }).some((link) => (
      link.getAttribute('href')?.startsWith('/dashboard/chat?q=Help+me+plan+around+Cabbage+Beach') ?? false
    ))).toBe(true)
    expect(screen.queryByRole('link', { name: 'Plan this trip' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Cabbage Beach')[0].closest('article')).toHaveClass('border-gray-200')
    expect(container.querySelector('.bg-gold-400')).toBeInTheDocument()
    expectNoColoredMarketplaceChrome(container)
  })

  test('guides page uses neutral guide cards and direct planning actions', async () => {
    const page = await GuidesPage()
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: 'Your island guidebook' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore islands' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Explore islands' }).querySelector('.bg-gold-400')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Read guide' })).toHaveClass('border-gray-300')
    expect(screen.getByRole('link', { name: 'Start trip' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Start trip' }).querySelector('.bg-gold-400')).toBeInTheDocument()
    expect(screen.getAllByText('Nassau food guide')[0].closest('article')).toHaveClass('border-gray-200')
    expect(container.innerHTML).not.toMatch(/bg-night/)
    expectNoColoredMarketplaceChrome(container)
  })
})
