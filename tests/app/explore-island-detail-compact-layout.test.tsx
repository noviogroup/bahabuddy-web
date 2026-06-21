import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import IslandDetailPage from '@/app/explore/island/[id]/page'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  notFound: vi.fn(),
  getIslandHero: vi.fn(),
  fetchDestinationByIsland: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: supabaseMocks.createClient,
}))

vi.mock('next/navigation', () => ({
  notFound: supabaseMocks.notFound,
}))

vi.mock('@/lib/islands', () => ({
  getIslandHero: supabaseMocks.getIslandHero,
}))

vi.mock('@/lib/sanity/queries', () => ({
  fetchDestinationByIsland: supabaseMocks.fetchDestinationByIsland,
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

vi.mock('@/components/detail/PlanWithBuddyCTA', () => ({
  PlanWithBuddyCTA: () => <section aria-label="Plan with Buddy">Plan with Buddy CTA</section>,
}))

vi.mock('@/components/marketplace/ImageWithSourcePolicy', () => ({
  default: ({
    alt,
    children,
    className,
    src,
    tone,
  }: {
    alt: string
    children?: ReactNode
    className?: string
    src?: string | null
    tone?: string
  }) => (
    <div
      aria-label={alt}
      className={className}
      data-src={src ?? ''}
      data-testid="image-policy"
      data-tone={tone}
      role="img"
    >
      {children}
    </div>
  ),
}))

type QueryResult = {
  data: unknown[] | null
  error: null
}

const attractionRows = [
  {
    id: 'stocking-island',
    name: 'Stocking Island',
    category: 'beach',
    island: 'the-exumas',
    description: 'A beach stop near Great Exuma with clear water.',
    image_url: 'https://images.example.com/stocking-island.jpg',
    tags: ['beach'],
    rating: 4.8,
    review_count: 300,
    amenities: null,
    short_description: 'Clear water beach stop.',
    enriched_at: '2026-06-01T00:00:00Z',
  },
]

const dealRows = [
  {
    id: 'exuma-stay-deal',
    title: 'Exuma stay deal',
    deal_type: 'accommodation',
    island: 'the-exumas',
    resort_name: 'Exuma Resort',
    description: 'A limited-time stay deal.',
    price_from_usd: 350,
    price_unit: 'per_night',
    image_url: null,
    highlights: ['Waterfront'],
    tags: ['stay'],
    valid_through: null,
  },
]

class MockSupabaseQuery {
  private result: QueryResult

  constructor(table: string) {
    this.result = table === 'bahamas_deals'
      ? { data: dealRows, error: null }
      : { data: attractionRows, error: null }
  }

  select = vi.fn(() => this)
  eq = vi.fn(() => this)
  limit = vi.fn(() => this)

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }
}

describe('Explore island detail compact marketplace layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMocks.notFound.mockImplementation(() => {
      throw new Error('not found')
    })
    supabaseMocks.getIslandHero.mockResolvedValue('https://images.example.com/exumas-hero.jpg')
    supabaseMocks.fetchDestinationByIsland.mockResolvedValue(null)
    supabaseMocks.createClient.mockResolvedValue({
      from: vi.fn((table: string) => new MockSupabaseQuery(table)),
    })
  })

  test('renders island detail without the old large hero and exposes direct marketplace actions', async () => {
    const page = await IslandDetailPage({ params: { id: 'the-exumas' } })
    const { container } = render(page)

    const header = screen.getByRole('heading', { level: 1, name: 'The Exumas' }).closest('section')
    expect(header).toHaveClass('border-gray-200')
    expect(header).toHaveClass('bg-white')
    expect(screen.getByRole('link', { name: 'Start island trip' })).toHaveAttribute(
      'href',
      '/dashboard/trips/new?returnTo=%2Fexplore%2Fisland%2Fthe-exumas&source=destination',
    )
    expect(screen.getByRole('link', { name: 'Browse stays' })).toHaveAttribute('href', '/stays?island=The%20Exumas')
    expect(screen.getByRole('link', { name: 'Things to do' })).toHaveAttribute('href', '/explore/places?island=The%20Exumas')

    const primaryImage = screen.getAllByTestId('image-policy')[0]
    expect(primaryImage).toHaveAttribute('data-src', 'https://images.example.com/exumas-hero.jpg')
    expect(primaryImage).toHaveAttribute('data-tone', 'island')
    expect(primaryImage).toHaveClass('rounded-baha-xl')

    expect(container.querySelector('a[href="/explore/places/stocking-island"]')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Check stays' })).toHaveAttribute('href', '/stays?island=Exuma')

    expect(container.innerHTML).not.toContain('relative h-72 md:h-96 overflow-hidden')
    expect(container.innerHTML).not.toContain('from-black/70 via-black/30 to-transparent')
    expect(container.innerHTML).not.toContain('DefaultHeaderHero')
  })
})
