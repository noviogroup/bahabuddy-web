import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import RestaurantsPage from '@/app/restaurants/page'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
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

vi.mock('@/components/marketplace/ImageWithSourcePolicy', () => ({
  default: ({
    alt,
    className,
    src,
    tone,
  }: {
    alt: string
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
    />
  ),
}))

type QueryResult = {
  data: unknown[] | null
  error: null
}

class MockSupabaseQuery {
  private result: QueryResult = { data: [], error: null }

  constructor(
    private readonly restaurantRows: unknown[],
    private readonly cuisineRows: unknown[],
  ) {}

  select = vi.fn((columns: string) => {
    this.result = columns === 'cuisine_types'
      ? { data: this.cuisineRows, error: null }
      : { data: this.restaurantRows, error: null }
    return this
  })

  eq = vi.fn(() => this)
  order = vi.fn(() => this)
  limit = vi.fn(() => this)
  ilike = vi.fn(() => this)
  contains = vi.fn(() => this)
  not = vi.fn(() => this)

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }
}

const restaurantRows = [
  {
    id: 'rest-1',
    location_id: 'fish-fry',
    category: 'restaurants',
    island_name: 'Nassau',
    name: 'Arawak Cay Fish Fry',
    address: null,
    rating: 4.7,
    num_reviews: 1280,
    price_level: '$$',
    cuisine_types: ['Bahamian', 'Seafood'],
    hotel_class: null,
    amenities: null,
    photos: null,
    reviews: null,
    website: null,
    tripadvisor_url: null,
    latitude: null,
    longitude: null,
  },
]

const cuisineRows = [
  { cuisine_types: ['Bahamian', 'Seafood'] },
]

describe('RestaurantsPage marketplace layout', () => {
  beforeEach(() => {
    supabaseMocks.createClient.mockResolvedValue({
      from: vi.fn(() => new MockSupabaseQuery(restaurantRows, cuisineRows)),
    })
  })

  test('renders restaurant search surfaces without gold borders or filled blue panels', async () => {
    const page = await RestaurantsPage({
      searchParams: {
        island: 'Nassau',
        cuisine: 'Bahamian',
      },
    })
    const { container } = render(page)

    const header = screen.getByRole('heading', { name: 'Where to eat in Nassau' }).closest('section')
    expect(header).toHaveClass('border-gray-200')
    expect(header).not.toHaveClass('border-sand-200')

    const startFoodTripLinks = screen.getAllByRole('link', { name: 'Start food trip' })
    expect(startFoodTripLinks[0]).toHaveAttribute(
      'href',
      '/dashboard/trips/new?returnTo=%2Frestaurants&source=restaurant',
    )
    expect(startFoodTripLinks[0]).toHaveClass('bg-brand-600')
    expect(screen.getAllByRole('link', { name: 'Explore food culture' })[0]).toHaveAttribute(
      'href',
      '/explore/places?island=Nassau&category=Dining&search=Bahamian',
    )
    expect(screen.queryByRole('link', { name: 'Ask Buddy for food picks' })).not.toBeInTheDocument()

    const filters = screen.getByRole('region', { name: 'Filter restaurants' })
    expect(filters).toHaveClass('border-gray-200')
    expect(filters).not.toHaveClass('border-sand-200')
    expect(screen.getByRole('link', { name: 'Clear all filters' })).not.toHaveClass('border-brand-200')

    const card = screen.getByText('Arawak Cay Fish Fry').closest('article')
    expect(card).toHaveClass('border-gray-200')
    expect(card).not.toHaveClass('border-gray-100')
    expect(screen.getByTestId('image-policy')).toHaveAttribute('data-tone', 'neutral')
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute('href', '/restaurants/fish-fry')
    expect(screen.getByRole('link', { name: 'Add to trip' })).toHaveAttribute('href', '/restaurants/fish-fry#trip-actions')
    expect(screen.getByRole('link', { name: 'Add to trip' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'More food nearby' })).toHaveAttribute(
      'href',
      '/explore/places?island=Nassau&category=Dining&search=Bahamian',
    )

    const cuisineBadges = screen.getAllByText('Bahamian')
    expect(cuisineBadges.some((badge) => badge.className.includes('bg-gray-100'))).toBe(true)

    const rationale = screen.getByText('Why Buddy picked this').closest('div')
    expect(rationale).toHaveClass('border-gray-200')
    expect(rationale).not.toHaveClass('border-brand-100')

    const diningCta = screen.getByText('Get personalized dining picks').closest('div')
    expect(diningCta).toHaveClass('border-gray-200')
    expect(diningCta).not.toHaveClass('bg-gradient-to-r')
    expect(screen.queryByRole('link', { name: 'Chat with Baha Buddy' })).not.toBeInTheDocument()
    expect(container.innerHTML).not.toMatch(/border-sand|bg-offwhite|ring-sand|border-gold|bg-sand/)
    expect(container.innerHTML).not.toMatch(/hover:border-brand|focus:border-brand/)
  })
})
