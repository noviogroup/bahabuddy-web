import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import RestaurantSlugPage from '@/app/restaurants/[id]/page'
import { canonicalPlaceRow, createRecordingSupabase } from '../fixtures/recording-supabase'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  notFound: vi.fn(),
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
    attribution,
    children,
    className,
    src,
    tone,
  }: {
    alt: string
    attribution?: string | null
    children?: ReactNode
    className?: string
    src?: string | null
    tone?: string
  }) => (
    <div
      aria-label={alt}
      className={className}
      data-attribution={attribution ?? ''}
      data-src={src ?? ''}
      data-testid="image-policy"
      data-tone={tone}
      role="img"
    >
      {children}
    </div>
  ),
}))

// Restaurant pages read canonical `places` rows (see src/lib/places.ts).
const fishFry = canonicalPlaceRow({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  slug: 'arawak-cay-fish-fry',
  name: 'Arawak Cay Fish Fry',
  category: 'restaurant',
  subcategory: null,
  island_name: 'Nassau',
  address: 'Arawak Cay, Nassau',
  primary_image_url: 'https://images.example.com/fish-fry.jpg',
  rating: 4.7,
  review_count: 1280,
  price_level: '$$',
  tags: ['Bahamian', 'Seafood'],
  metadata: { image_attribution: 'Photo: Tripadvisor' },
})

const conchSpot = canonicalPlaceRow({
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  slug: 'conch-spot',
  name: 'Conch Spot',
  category: 'restaurant',
  subcategory: null,
  island_name: 'Nassau',
  primary_image_url: null,
  tags: ['Bahamian'],
})

function useRestaurantRows(rows: Record<string, unknown>[]) {
  const { client } = createRecordingSupabase({
    tables: (query) => {
      const lookup = query.calls.find((call) => call.method === 'eq' && (call.args[0] === 'slug' || call.args[0] === 'id'))
      const data = lookup ? rows.filter((row) => row[lookup.args[0] as string] === lookup.args[1]) : rows
      return { data, error: null }
    },
  })
  supabaseMocks.createClient.mockResolvedValue(client)
}

const STALE_COPY = /reviews and photos from TripAdvisor|being loaded|check back soon|publication-ready|canonical/i

describe('Restaurant detail compact marketplace layout', () => {
  beforeEach(() => {
    supabaseMocks.notFound.mockImplementation(() => {
      throw new Error('not found')
    })
    useRestaurantRows([fishFry, conchSpot])
  })

  test('renders individual restaurant detail without the old full image hero', async () => {
    const page = await RestaurantSlugPage({ params: { id: 'arawak-cay-fish-fry' } })
    const { container } = render(page)

    const header = screen.getByRole('heading', { level: 1, name: 'Arawak Cay Fish Fry' }).closest('section')
    expect(header).toHaveClass('border-gray-200')
    expect(screen.getByRole('link', { name: 'Start food trip' })).toHaveAttribute(
      'href',
      `/dashboard/trips/new?returnTo=%2Frestaurants%2F${fishFry.id}&source=restaurant`,
    )
    expect(screen.getByRole('link', { name: 'More food nearby' })).toHaveAttribute(
      'href',
      '/explore/places?island=Nassau&category=Dining&search=Bahamian',
    )

    const primaryImage = screen.getAllByTestId('image-policy')[0]
    expect(primaryImage).toHaveAttribute('data-src', 'https://images.example.com/fish-fry.jpg')
    expect(primaryImage).toHaveAttribute('data-tone', 'restaurant')
    expect(primaryImage).toHaveClass('rounded-baha-xl')
    // The catalog photo credit travels with the photo.
    expect(primaryImage).toHaveAttribute('data-attribution', 'Photo: Tripadvisor')
    expect(screen.getByLabelText('Save this restaurant')).toHaveAttribute('data-source-type', 'web_restaurant_detail')
    // Every photo goes through the image source policy; no raw <img> bypass.
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(screen.getByText('Conch Spot')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Details' })).toHaveClass('uppercase')
    expect(container.innerHTML).not.toMatch(/uppercaser|\btext-gray-400\b/)
    expect(container).not.toHaveTextContent(STALE_COPY)
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
    expect(screen.getAllByTestId('image-policy')[0]).toHaveAttribute('data-attribution', 'Photo: Tripadvisor')

    expect(container).not.toHaveTextContent(STALE_COPY)
    expect(container.innerHTML).not.toMatch(/\btext-gray-400\b/)
    expect(container.innerHTML).not.toMatch(/DefaultHeaderHero|h-72|md:h-\[28rem\]|from-black\/70|via-black\/30/)
  })

  test('an island with no published restaurants says so plainly', async () => {
    useRestaurantRows([])
    const { container } = render(await RestaurantSlugPage({ params: { id: 'nassau' } }))

    expect(screen.getByText('No published restaurants for Nassau yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse all restaurants' })).toHaveAttribute('href', '/restaurants')
    expect(container).not.toHaveTextContent(STALE_COPY)
  })
})
