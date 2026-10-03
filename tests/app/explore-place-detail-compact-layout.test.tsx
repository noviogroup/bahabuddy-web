import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import PlaceDetailPage from '@/app/explore/places/[id]/page'
import { canonicalPlaceRow, createRecordingSupabase } from '../fixtures/recording-supabase'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  notFound: vi.fn(),
}))

const componentMocks = vi.hoisted(() => ({
  directTripItemActions: vi.fn(),
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
  default: (props: Record<string, unknown>) => {
    componentMocks.directTripItemActions(props)
    return (
      <section aria-label={String(props.heading)} data-source-id={String(props.sourceId)} data-source-type={String(props.sourceType)}>
        {String(props.heading)}
      </section>
    )
  },
}))

vi.mock('@/components/marketplace/ImageWithSourcePolicy', () => ({
  default: ({
    alt,
    children,
    className,
    src,
    tone,
    attribution,
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

// Place detail reads canonical `places` rows (see src/lib/places.ts).
const placeRow = canonicalPlaceRow({
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  slug: 'pink-sands',
  name: 'Pink Sands Beach',
  category: 'beach',
  subcategory: null,
  island_id: 'eleuthera-harbour-island',
  island_name: 'Harbour Island',
  latitude: 25.5,
  longitude: -76.63,
  description: 'A long stretch of pink sand with calm water and easy beach access.',
  short_description: 'Pink sand beach on Harbour Island.',
  primary_image_url: 'https://images.example.com/pink-sands.jpg',
  tags: ['beach', 'family'],
  rating: 4.8,
  review_count: 920,
  amenities: ['restrooms', 'parking'],
  website: 'https://example.com/pink-sands',
  metadata: { image_attribution: 'Photo: Tripadvisor' },
})

const reviewRows = [
  {
    id: 'review-google',
    platform: 'Google',
    rating: 4.8,
    review_count: 920,
    summary: 'Popular for beach days and photos.',
  },
]

function useCatalog() {
  const { client } = createRecordingSupabase({
    tables: (query) => {
      if (query.table === 'place_reviews') return { data: reviewRows, error: null }
      if (query.table === 'place_photos') return { data: [], error: null }
      const slug = query.calls.find((call) => call.method === 'eq' && call.args[0] === 'slug')
      if (slug) return { data: slug.args[1] === placeRow.slug ? [placeRow] : [], error: null }
      return { data: [placeRow], error: null }
    },
  })
  supabaseMocks.createClient.mockResolvedValue(client)
}

describe('Explore place detail compact marketplace layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMocks.notFound.mockImplementation(() => {
      throw new Error('not found')
    })
    useCatalog()
  })

  test('renders place detail without the old full image hero and keeps direct trip actions', async () => {
    const page = await PlaceDetailPage({ params: { id: 'pink-sands' } })
    const { container } = render(page)

    const header = screen.getByRole('heading', { level: 1, name: 'Pink Sands Beach' }).closest('section')
    expect(header).toHaveClass('border-gray-200')
    expect(header).toHaveClass('bg-white')
    expect(screen.getByRole('link', { name: 'Add to trip' })).toHaveAttribute('href', '#trip-actions')
    expect(screen.getByRole('link', { name: 'More nearby' })).toHaveAttribute(
      'href',
      '/explore/places?island=Harbour+Island&category=Beach&search=Beach',
    )

    const primaryImage = screen.getAllByTestId('image-policy')[0]
    expect(primaryImage).toHaveAttribute('data-src', 'https://images.example.com/pink-sands.jpg')
    expect(primaryImage).toHaveAttribute('data-tone', 'island')
    expect(primaryImage).toHaveClass('rounded-baha-xl')
    expect(primaryImage).toHaveAttribute('data-attribution', 'Photo: Tripadvisor')

    expect(screen.getByLabelText('Save this experience')).toHaveAttribute('data-source-type', 'web_place_detail')
    expect(componentMocks.directTripItemActions).toHaveBeenCalledWith(expect.objectContaining({
      itemType: 'activity',
      sourceId: placeRow.id,
      sourceType: 'web_place_detail',
      name: 'Pink Sands Beach',
      island: 'Harbour Island',
      imageUrl: 'https://images.example.com/pink-sands.jpg',
      returnPath: '/explore/places/pink-sands#trip-actions',
      heading: 'Save this experience',
      primaryLabel: 'Add experience to trip',
      timeSlot: 'afternoon',
      metadata: expect.objectContaining({
        category: 'Beach',
        tags: ['beach', 'family'],
        rating: 4.8,
        reviewCount: 920,
      }),
    }))

    expect(container.innerHTML).not.toContain('uppercaser')
    expect(container.innerHTML).not.toContain('relative h-72 md:h-[28rem] overflow-hidden')
    expect(container.innerHTML).not.toContain('from-black/70 via-black/30 to-transparent')
    expect(container.innerHTML).not.toContain('DefaultHeaderHero')
  })
})
