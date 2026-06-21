import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import RestaurantSlugPage from '@/app/restaurants/[id]/page'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: supabaseMocks.createClient,
}))

vi.mock('next/navigation', () => ({
  notFound: supabaseMocks.notFound,
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

vi.mock('@/components/trip/DirectTripItemActions', () => ({
  default: ({
    heading,
    sourceId,
    sourceType,
  }: {
    heading: string
    sourceId: string
    sourceType: string
  }) => (
    <section aria-label={heading} data-source-id={sourceId} data-source-type={sourceType}>
      {heading}
    </section>
  ),
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
  data: unknown[] | unknown | null
  error: null
}

const restaurantRows = [
  {
    id: 'rest-1',
    location_id: 'fish-fry',
    category: 'restaurants',
    island_name: 'Nassau',
    name: 'Arawak Cay Fish Fry',
    address: {
      street1: 'Arawak Cay',
      city: 'Nassau',
      state: 'New Providence',
      country: 'BS',
    },
    rating: 4.7,
    num_reviews: 1280,
    price_level: '$$',
    cuisine_types: ['Bahamian', 'Seafood'],
    hotel_class: null,
    amenities: null,
    photos: [{ url: 'https://images.example.com/fish-fry.jpg', caption: 'Fish fry patio' }],
    reviews: null,
    website: null,
    tripadvisor_url: null,
    latitude: null,
    longitude: null,
  },
]

const similarRows = [
  {
    ...restaurantRows[0],
    id: 'rest-2',
    location_id: 'conch-spot',
    name: 'Conch Spot',
    photos: null,
  },
]

class MockSupabaseQuery {
  private result: QueryResult = { data: restaurantRows, error: null }

  select = vi.fn(() => {
    this.result = { data: restaurantRows, error: null }
    return this
  })

  eq = vi.fn((column: string, value: string) => {
    if (column === 'location_id') {
      this.result = {
        data: restaurantRows.find((row) => row.location_id === value) ?? null,
        error: null,
      }
    }
    return this
  })

  ilike = vi.fn(() => this)
  order = vi.fn(() => this)
  limit = vi.fn(() => this)

  neq = vi.fn(() => {
    this.result = { data: similarRows, error: null }
    return this
  })

  single = vi.fn(async () => this.result)

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }
}

describe('Restaurant detail compact marketplace layout', () => {
  beforeEach(() => {
    supabaseMocks.notFound.mockImplementation(() => {
      throw new Error('not found')
    })
    supabaseMocks.createClient.mockResolvedValue({
      from: vi.fn(() => new MockSupabaseQuery()),
    })
  })

  test('renders individual restaurant detail without the old full image hero', async () => {
    const page = await RestaurantSlugPage({ params: { id: 'fish-fry' } })
    const { container } = render(page)

    const header = screen.getByRole('heading', { level: 1, name: 'Arawak Cay Fish Fry' }).closest('section')
    expect(header).toHaveClass('border-gray-200')
    expect(screen.getByRole('link', { name: 'Start food trip' })).toHaveAttribute(
      'href',
      '/dashboard/trips/new?returnTo=%2Frestaurants%2Ffish-fry&source=restaurant',
    )
    expect(screen.getByRole('link', { name: 'More food nearby' })).toHaveAttribute(
      'href',
      '/explore/places?island=Nassau&category=Dining&search=Bahamian',
    )

    const primaryImage = screen.getAllByTestId('image-policy')[0]
    expect(primaryImage).toHaveAttribute('data-src', 'https://images.example.com/fish-fry.jpg')
    expect(primaryImage).toHaveAttribute('data-tone', 'restaurant')
    expect(primaryImage).toHaveClass('rounded-baha-xl')
    expect(screen.getByLabelText('Save this restaurant')).toHaveAttribute('data-source-type', 'web_restaurant_detail')

    expect(container.innerHTML).not.toMatch(/DefaultHeaderHero|h-72|md:h-\[28rem\]|from-black\/70|via-black\/30/)
  })

  test('renders island restaurant listing with compact header and provider image policy', async () => {
    const page = await RestaurantSlugPage({ params: { id: 'nassau' } })
    const { container } = render(page)

    const header = screen.getByRole('heading', { level: 1, name: 'Best Restaurants in Nassau' }).closest('section')
    expect(header).toHaveClass('border-gray-200')
    expect(screen.getByRole('link', { name: 'Start food trip' })).toHaveAttribute(
      'href',
      '/dashboard/trips/new?returnTo=%2Frestaurants%2Fnassau&source=restaurant',
    )
    expect(screen.getByRole('link', { name: 'Explore food culture' })).toHaveAttribute(
      'href',
      '/explore/places?island=Nassau&category=Dining&search=Food',
    )
    expect(screen.getAllByTestId('image-policy')[0]).toHaveAttribute('data-src', 'https://images.example.com/fish-fry.jpg')
    expect(screen.getAllByTestId('image-policy')[0]).toHaveAttribute('data-tone', 'restaurant')

    expect(container.innerHTML).not.toMatch(/DefaultHeaderHero|h-72|md:h-\[28rem\]|from-black\/70|via-black\/30/)
  })
})
