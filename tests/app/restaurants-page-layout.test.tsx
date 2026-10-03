import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import RestaurantsPage from '@/app/restaurants/page'
import { canonicalPlaceRow, createRecordingSupabase } from '../fixtures/recording-supabase'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
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

// The restaurant index reads canonical `places` rows (see src/lib/places.ts).
const fishFry = canonicalPlaceRow({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  slug: 'arawak-cay-fish-fry',
  name: 'Arawak Cay Fish Fry',
  category: 'restaurant',
  subcategory: null,
  island_name: 'Nassau',
  primary_image_url: null,
  rating: 4.7,
  review_count: 1280,
  price_level: '$$',
  tags: ['Bahamian', 'Seafood'],
})

describe('RestaurantsPage marketplace layout', () => {
  beforeEach(() => {
    const { client } = createRecordingSupabase({
      tables: () => ({ data: [fishFry], error: null }),
    })
    supabaseMocks.createClient.mockResolvedValue(client)
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
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute('href', `/restaurants/${fishFry.id}`)
    expect(screen.getByRole('link', { name: 'Add to trip' })).toHaveAttribute('href', `/restaurants/${fishFry.id}#trip-actions`)
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

  test('an empty result says no restaurants are published instead of promising a reload', async () => {
    const { client } = createRecordingSupabase({ tables: () => ({ data: [], error: null }) })
    supabaseMocks.createClient.mockResolvedValue(client)

    const { container } = render(await RestaurantsPage({ searchParams: { island: 'Nassau' } }))

    expect(screen.getByText('No published restaurants for Nassau yet')).toBeInTheDocument()
    expect(container).not.toHaveTextContent(/being loaded|check back soon/i)
  })
})
