import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ActivityDetailPage from '@/app/(dashboard)/activities/[id]/page'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

const componentMocks = vi.hoisted(() => ({
  directTripItemActions: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: supabaseMocks.createClient,
}))

vi.mock('@/components/trip/DirectTripItemActions', () => ({
  default: (props: Record<string, unknown>) => {
    componentMocks.directTripItemActions(props)
    return (
      <section data-testid="direct-trip-actions">
        <h2>{String(props.heading)}</h2>
        <a href={String(props.returnPath)}>{String(props.primaryLabel)}</a>
      </section>
    )
  },
}))

vi.mock('@/components/marketplace/ImageWithSourcePolicy', () => ({
  default: (props: {
    src?: string | null
    alt: string
    title: string
    className?: string
    children?: ReactNode
  }) => (
    <figure
      data-testid="activity-image"
      data-src={props.src ?? ''}
      data-alt={props.alt}
      className={props.className}
    >
      <figcaption>{props.title}</figcaption>
      {props.children}
    </figure>
  ),
}))

class MockActivityQuery {
  constructor(private readonly row: unknown) {}

  select = vi.fn(() => this)
  eq = vi.fn(() => this)
  maybeSingle = vi.fn(async () => ({ data: this.row, error: null }))
}

describe('ActivityDetailPage direct actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns to Explore activities and exposes direct add-to-trip before Buddy planning', async () => {
    const query = new MockActivityQuery({
      place_id: 'exuma-cays-tour',
      name: 'Exuma Cays Boat Tour',
      type: 'attraction',
      island_id: 'exuma',
      rating: 4.8,
      user_ratings_total: 320,
      address: 'Great Exuma',
      photo_url: 'https://images.example/exuma-tour.jpg',
      description: 'A guided boat day across the Exuma cays.',
      vibe_tags: ['adventure', 'beach'],
      kid_friendly: true,
    })

    supabaseMocks.createClient.mockResolvedValue({
      from: vi.fn(() => query),
    })

    const page = await ActivityDetailPage({ params: { id: 'exuma-cays-tour' } })
    const { container } = render(page)

    expect(screen.getByText('Experience detail')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Exuma Cays Boat Tour' })).toBeInTheDocument()
    expect(screen.getByText('Rating 4.8/5 from 320 reviews')).toBeInTheDocument()

    const backHref = screen.getByRole('link', { name: 'Browse more activities' }).getAttribute('href') ?? ''
    const backUrl = new URL(backHref, 'https://bahabuddy.test')
    expect(backUrl.pathname).toBe('/explore/places')
    expect(backUrl.searchParams.get('category')).toBe('Activity')
    expect(backUrl.searchParams.get('island')).toBe('Exuma')
    expect(screen.queryByRole('link', { name: 'Back to chat' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Back to activities' })).not.toBeInTheDocument()

    const activityImage = screen.getByTestId('activity-image')
    expect(activityImage).toHaveAttribute('data-src', 'https://images.example/exuma-tour.jpg')
    expect(activityImage).toHaveAttribute('data-alt', 'Exuma Cays Boat Tour')

    expect(screen.getByTestId('direct-trip-actions')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add experience to trip' })).toHaveAttribute(
      'href',
      '/activities/exuma-cays-tour#trip-actions',
    )
    expect(componentMocks.directTripItemActions).toHaveBeenCalledWith(expect.objectContaining({
      itemType: 'activity',
      sourceId: 'exuma-cays-tour',
      sourceType: 'web_activity_detail',
      name: 'Exuma Cays Boat Tour',
      island: 'Exuma',
      imageUrl: 'https://images.example/exuma-tour.jpg',
      returnPath: '/activities/exuma-cays-tour#trip-actions',
      heading: 'Save this experience',
      primaryLabel: 'Add experience to trip',
      createTripLabel: 'Create trip for this experience',
      savedLabel: 'Saved experience to trip',
      timeSlot: 'afternoon',
      metadata: expect.objectContaining({
        category: 'attraction',
        vibeTags: ['adventure', 'beach'],
        rating: 4.8,
        reviewCount: 320,
        address: 'Great Exuma',
        kidFriendly: true,
      }),
    }))

    expect(container.innerHTML).not.toContain('bg-gradient-to-br from-brand-600 via-brand-500 to-cyan-500')
    expect(container.innerHTML).not.toContain('aspect-[16/9] sm:aspect-[2/1]')
    expect(container.innerHTML).not.toContain('DefaultHeaderHero')
  })
})
