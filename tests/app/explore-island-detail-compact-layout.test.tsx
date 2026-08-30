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
  eq = vi.fn(() => this)
  ['in'] = vi.fn(() => this)
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
    expect(screen.getByRole('link', { name: 'Things to do' })).toHaveAttribute('href', '/explore/places?island=The%20Exumas')
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

    expect(container.querySelector('a[href="/explore/places?category=beach&island=the-exumas"]')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Search stays' })).not.toBeInTheDocument()

    expect(container.innerHTML).not.toContain('relative h-72 md:h-96 overflow-hidden')
    expect(container.innerHTML).not.toContain('from-black/70 via-black/30 to-transparent')
    expect(container.innerHTML).not.toContain('DefaultHeaderHero')
    expect(container.innerHTML).not.toContain('lg:grid-cols-[264px_minmax(0,1fr)]')
  })
})
