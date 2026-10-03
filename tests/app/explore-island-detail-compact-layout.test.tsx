import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import IslandDetailPage from '@/app/explore/island/[id]/page'

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  notFound: vi.fn(),
  getIslandHero: vi.fn(),
  fetchDestinationByIsland: vi.fn(),
  fetchArticles: vi.fn(),
  fetchIslandWeather: vi.fn(),
  getStayStartingRates: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
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

vi.mock('next/navigation', () => ({
  notFound: supabaseMocks.notFound,
}))

vi.mock('@/lib/islands', () => ({
  getIslandHero: supabaseMocks.getIslandHero,
}))

vi.mock('@/lib/sanity/queries', () => ({
  fetchDestinationByIsland: supabaseMocks.fetchDestinationByIsland,
  fetchArticles: supabaseMocks.fetchArticles,
}))

vi.mock('@/lib/weather', () => ({
  fetchIslandWeather: supabaseMocks.fetchIslandWeather,
}))

vi.mock('@/lib/hotels', () => ({
  getStayStartingRates: supabaseMocks.getStayStartingRates,
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

const stayRows = [
  {
    id: 'rosewood-baha-mar',
    name: 'Rosewood Baha Mar',
    island: 'Exuma',
    city: 'Nassau',
    star_rating: 5,
    review_score: 9,
    review_count: 120,
    main_photo_url: 'https://images.example.com/rosewood.jpg',
    photos: null,
    property_type_name: 'Resort',
    description: 'A luxury beach resort.',
  },
  {
    id: 'sls-at-baha-mar',
    name: 'SLS at Baha Mar',
    island: 'Exuma',
    city: 'Nassau',
    star_rating: 5,
    review_score: 8.2,
    review_count: 90,
    main_photo_url: 'https://images.example.com/sls.jpg',
    photos: null,
    property_type_name: 'Resort',
    description: 'A lively beach resort.',
  },
]

class MockSupabaseQuery {
  private result: QueryResult

  constructor(table: string) {
    const rowsByTable: Record<string, unknown[]> = {
      bahamas_attractions: attractionRows,
      bahamas_deals: dealRows,
      hotels: stayRows,
      historic_landmarks: [],
      island_faq: [],
      islands: [],
      self_tours: [],
      tripadvisor_locations: [],
    }
    this.result = { data: rowsByTable[table] ?? [], error: null }
  }

  select = vi.fn(() => this)
  eq = vi.fn(() => this);
  ['in'] = vi.fn<() => MockSupabaseQuery>(() => this);
  limit = vi.fn(() => this)
  or = vi.fn(() => this)
  order = vi.fn(() => this)
  single = vi.fn(() => this)

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
    supabaseMocks.fetchArticles.mockResolvedValue([])
    supabaseMocks.fetchIslandWeather.mockResolvedValue({
      islandId: 'exuma',
      islandName: 'Exuma',
      tempF: 84,
      humidity: 71,
      windMph: 12,
      condition: 'Partly cloudy',
      forecast: [
        { date: '2026-07-07', highF: 88, lowF: 78, rainChance: 30, condition: 'Partly cloudy' },
      ],
      source: 'open-meteo',
    })
    supabaseMocks.getStayStartingRates.mockResolvedValue(new Map([
      ['rosewood-baha-mar', {
        hotelId: 'rosewood-baha-mar',
        currency: 'USD',
        total: 1050,
        nightly: 350,
        nights: 3,
      }],
    ]))
    supabaseMocks.createClient.mockResolvedValue({
      from: vi.fn((table: string) => new MockSupabaseQuery(table)),
      rpc: vi.fn(async () => ({
        data: attractionRows.map((row) => ({
          activity_id: '24600000-0000-4000-8000-000000000001',
          place_id: null,
          source_layer: 'places',
          source_record_id: row.id,
          name: row.name,
          island_slug: row.island,
          category_tags: row.tags,
          description: row.description,
          location_model: 'exact_point',
          latitude: 23.5,
          longitude: -75.7,
          location_notes: null,
          contact: {},
          seasonality: {},
          safety_access: {},
          price_basis: {},
          booking_quote_state: 'informational_only',
          cancellation: {},
          media: { hero_url: row.image_url },
          duration: null,
          meeting_pickup: null,
          group_age_limits: null,
          source_checked_at: row.enriched_at,
          source_recheck_at: '2026-10-01T00:00:00Z',
          source_owner: 'Baha Buddy',
          source_class: 'official',
          source_url: 'https://example.invalid/stocking-island',
          live_availability_state: 'requires_live_check',
        })),
        error: null,
      })),
    })
  })

  test('renders island detail without the old large hero and exposes direct marketplace actions', async () => {
    const page = await IslandDetailPage({ params: { id: 'the-exumas' } })
    const { container } = render(page)

    expect(screen.getByRole('heading', { level: 1, name: 'The Exumas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start island trip' })).toHaveAttribute(
      'href',
      '/dashboard/trips/new?returnTo=%2Fexplore%2Fisland%2Fthe-exumas&source=destination',
    )
    expect(screen.getByRole('link', { name: 'Search flights' })).toHaveAttribute('href', '/flights?destination=EXU')
    expect(screen.getByRole('link', { name: 'Browse stays' })).toHaveAttribute('href', expect.stringContaining('/stays?island=Exuma'))
    expect(screen.getByRole('link', { name: 'Browse stays' })).toHaveAttribute('href', expect.stringContaining('checkin='))
    expect(screen.getByRole('link', { name: 'Browse stays' })).toHaveAttribute('href', expect.stringContaining('checkout='))
    expect(screen.getByRole('link', { name: 'Things to do' })).toHaveAttribute('href', '/explore/places?island=The%20Exumas&category=Activity')
    expect(screen.getByText('Live planning snapshot')).toBeInTheDocument()
    expect(screen.getByTestId('island-live-feeds')).toHaveClass('mt-5')
    expect(screen.getByText('Weather this week')).toBeInTheDocument()
    expect(screen.getByTestId('weather-forecast-strip')).toHaveClass('grid-cols-7')
    expect(screen.getByTestId('weather-forecast-strip')).not.toHaveClass('grid-cols-4')
    expect(screen.getByText('Where to stay')).toBeInTheDocument()
    expect(screen.getByText('Rosewood Baha Mar')).toBeInTheDocument()
    expect(screen.getByText('SLS at Baha Mar')).toBeInTheDocument()
    expect(screen.getAllByText('Starting nightly rate').length).toBeGreaterThan(1)
    expect(screen.getAllByText(/\$350/).length).toBeGreaterThan(0)
    expect(screen.getByText(/3 nights/)).toBeInTheDocument()
    expect(screen.getByText('Check live rate')).toBeInTheDocument()
    expect(screen.queryByText('Cached rate pending')).not.toBeInTheDocument()
    expect(screen.getByText('Restaurant feed is being enriched')).toBeInTheDocument()
    expect(screen.getByText('Marketplace footer')).toBeInTheDocument()
    expect(supabaseMocks.getStayStartingRates).toHaveBeenCalledWith(expect.objectContaining({
      hotelIds: ['rosewood-baha-mar', 'sls-at-baha-mar'],
      adults: 2,
      currency: 'USD',
      guestNationality: 'US',
      limit: 4,
    }))

    const primaryImage = screen.getAllByTestId('image-policy')[0]
    expect(primaryImage).toHaveAttribute('data-src', 'https://images.example.com/exumas-hero.jpg')
    expect(primaryImage).toHaveAttribute('data-tone', 'island')
    expect(primaryImage).toHaveClass('rounded-baha-lg')

    expect(container.querySelector('a[href="/explore/places?category=beach&island=the-exumas&match=exact"]')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Search stays' })).not.toBeInTheDocument()

    expect(container.innerHTML).not.toContain('relative h-72 md:h-96 overflow-hidden')
    expect(container.innerHTML).not.toContain('from-black/70 via-black/30 to-transparent')
    expect(container.innerHTML).not.toContain('DefaultHeaderHero')
    expect(container.innerHTML).not.toContain('lg:grid-cols-[264px_minmax(0,1fr)]')
    // Empty sections describe coverage in traveler terms.
    expect(screen.getByText('No self-guided tours for The Exumas yet.')).toBeInTheDocument()
    expect(container).not.toHaveTextContent(/source-approved|approved inventory|route-ready|passes review/i)
  })

  test('lists approved self-guided tours from the full RPC page and links them by activity id', async () => {
    const tourActivityId = '24600000-0000-4000-8000-000000000301'
    const rpc = vi.fn(async (_name: string, params: Record<string, unknown>) => ({
      data: [{
        activity_id: tourActivityId,
        place_id: null,
        source_layer: 'self_tours',
        source_record_id: 'exuma-cays-route',
        name: 'Exuma Cays Heritage Route',
        island_slug: 'the-exumas',
        category_tags: ['self_tour', 'boat, beach & culture'],
        description: 'Self-guided cays route.',
        location_model: 'area_only',
        latitude: null,
        longitude: null,
        location_notes: 'Great Exuma',
        contact: {},
        seasonality: {},
        safety_access: {},
        price_basis: {},
        booking_quote_state: 'informational_only',
        cancellation: {},
        media: {},
        duration: null,
        meeting_pickup: null,
        group_age_limits: null,
        source_checked_at: '2026-09-26T00:00:00Z',
        source_recheck_at: '2026-10-26T00:00:00Z',
        source_owner: 'Baha Buddy',
        source_class: 'editorial',
        source_url: 'https://example.invalid/exuma-route',
        live_availability_state: 'not_applicable',
      }].filter(() => params.p_island_slug === 'the-exumas'),
      error: null,
    }))
    const client = await supabaseMocks.createClient()
    supabaseMocks.createClient.mockResolvedValue({ ...client, rpc })

    const { container } = render(await IslandDetailPage({ params: { id: 'the-exumas' } }))

    // The RPC cannot filter by layer, so the tour feed reads its full page.
    expect(rpc).toHaveBeenCalledWith('get_approved_activity_recommendations', expect.objectContaining({
      p_island_slug: 'the-exumas',
      p_limit: 100,
    }))
    const tourLink = container.querySelector(`a[href="/tours/${tourActivityId}"]`)
    expect(tourLink).toBeInTheDocument()
    expect(tourLink).toHaveTextContent('Exuma Cays Heritage Route')
    expect(tourLink).toHaveTextContent('boat, beach & culture')
    expect(tourLink).not.toHaveTextContent('self_tour')
  })
})
