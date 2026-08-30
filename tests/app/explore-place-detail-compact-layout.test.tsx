import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import PlaceDetailPage from '@/app/explore/places/[id]/page'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  notFound: vi.fn(),
}))

const componentMocks = vi.hoisted(() => ({
  directTripItemActions: vi.fn(),
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
  error: { message: string } | null
}

const placeRow = {
  id: 'pink-sands',
  name: 'Pink Sands Beach',
  category: 'Beach',
  island: 'Harbour Island',
  description: 'A long stretch of pink sand with calm water and easy beach access.',
  image_url: 'https://images.example.com/pink-sands.jpg',
  source_url: 'https://example.com/pink-sands',
  tags: ['beach', 'family'],
  rating: 4.8,
  review_count: 920,
  amenities: ['restrooms', 'parking'],
  pros: ['Beautiful sand and clear water'],
  cons: ['Can be busy in peak season'],
  short_description: 'Pink sand beach on Harbour Island.',
  phone: null,
  website: 'https://example.com/pink-sands',
  hours: { monday: 'Open 24 hours' },
  price_range: 'Free',
  lat: null,
  lng: null,
  enriched_at: '2026-06-01T00:00:00Z',
  tripadvisor_url: 'https://tripadvisor.example.com/pink-sands',
  tripadvisor_rating: 4.7,
  tripadvisor_num_reviews: 1400,
}

const reviewRows = [
  {
    id: 'review-google',
    platform: 'Google',
    rating: 4.8,
    review_count: 920,
    summary: 'Popular for beach days and photos.',
  },
]

const similarRows = [
  {
    id: 'gaulding-cay',
    name: 'Gaulding Cay Beach',
    category: 'Beach',
    island: 'Eleuthera',
    image_url: null,
    rating: 4.6,
  },
]

class MockSupabaseQuery {
  private columns = ''
  private result: QueryResult

  constructor(private readonly table: string) {
    this.result = table === 'v_places_search'
      ? { data: [], error: null }
      : table === 'place_reviews'
      ? { data: reviewRows, error: null }
      : table === 'place_photos'
        ? { data: [], error: null }
        : { data: placeRow, error: null }
  }

  select = vi.fn((columns: string) => {
    this.columns = columns
    if (this.table === 'bahamas_attractions' && columns !== '*') {
      this.result = { data: similarRows, error: null }
    }
    return this
  })

  eq = vi.fn(() => this)
  order = vi.fn(() => this)
  limit = vi.fn(() => this)
  neq = vi.fn(() => {
    this.result = { data: similarRows, error: null }
    return this
  })

  single = vi.fn(async () => (
    this.table === 'v_places_search'
      ? { data: null, error: { message: 'not found' } }
      : { data: placeRow, error: null }
  ))

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    if (this.table === 'bahamas_attractions' && this.columns !== '*') {
      this.result = { data: similarRows, error: null }
    }
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }
}

describe('Explore place detail compact marketplace layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMocks.notFound.mockImplementation(() => {
      throw new Error('not found')
    })
    supabaseMocks.createClient.mockResolvedValue({
      from: vi.fn((table: string) => new MockSupabaseQuery(table)),
    })
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

    expect(screen.getByLabelText('Save this experience')).toHaveAttribute('data-source-type', 'web_place_detail')
    expect(componentMocks.directTripItemActions).toHaveBeenCalledWith(expect.objectContaining({
      itemType: 'activity',
      sourceId: 'pink-sands',
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

    expect(container.innerHTML).not.toContain('relative h-72 md:h-[28rem] overflow-hidden')
    expect(container.innerHTML).not.toContain('from-black/70 via-black/30 to-transparent')
    expect(container.innerHTML).not.toContain('DefaultHeaderHero')
  })
})
