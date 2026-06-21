import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import StaysPage from '@/app/stays/page'

const hotelMocks = vi.hoisted(() => ({
  getHotels: vi.fn(),
  getFeaturedStayHotels: vi.fn(),
  getIslandOptions: vi.fn(),
  getCityOptions: vi.fn(),
  getPropertyTypes: vi.fn(),
  getAmenityOptions: vi.fn(),
  FEATURED_STAY_ISLANDS: [
    { label: 'Nassau', aliases: ['nassau'] },
    { label: 'Exuma', aliases: ['exuma'] },
    { label: 'Harbour Island', aliases: ['harbour island'] },
    { label: 'Abaco', aliases: ['abaco'] },
    { label: 'Bimini', aliases: ['bimini'] },
  ],
  hotelHeroPhotoUrl: vi.fn((hotel: { main_photo_url?: string | null }) => hotel.main_photo_url ?? null),
}))

vi.mock('@/lib/hotels', () => hotelMocks)

const dealMocks = vi.hoisted(() => ({
  getStayDeals: vi.fn(),
}))

vi.mock('@/lib/deals', () => dealMocks)

vi.mock('@/components/Footer', () => ({
  default: () => <footer>Marketplace footer</footer>,
}))

vi.mock('@/components/ChatWidget', () => ({
  default: () => null,
}))

vi.mock('@/components/TrackView', () => ({
  default: () => null,
}))

vi.mock('@/components/stays/StayCardImage', () => ({
  default: ({ alt, src }: { alt: string; src: string | null }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src ?? ''} />
  ),
}))

const sampleHotels = [
  {
    id: 'lp-ocean-club',
    name: 'Ocean Club Resort',
    address: null,
    city: null,
    island: 'Nassau',
    country_code: 'BS',
    latitude: null,
    longitude: null,
    star_rating: 5,
    review_score: 9.2,
    review_count: 312,
    description: null,
    main_photo_url: 'https://images.example/ocean-club.jpg',
    photos: null,
    amenities: ['Pool', 'Beachfront', 'Spa'],
    property_type_id: 1,
    property_type_name: 'Resort',
    is_active: true,
    last_synced_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
]

describe('StaysPage marketplace layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hotelMocks.getHotels.mockResolvedValue(sampleHotels)
    hotelMocks.getFeaturedStayHotels.mockResolvedValue(sampleHotels)
    hotelMocks.getIslandOptions.mockResolvedValue(['Exuma'])
    hotelMocks.getCityOptions.mockResolvedValue(['Paradise Island', 'Cable Beach'])
    hotelMocks.getPropertyTypes.mockResolvedValue(['Hotel', 'Villa', 'Home'])
    hotelMocks.getAmenityOptions.mockResolvedValue(['Pool', 'Beachfront', 'Kitchen'])
    hotelMocks.hotelHeroPhotoUrl.mockImplementation((hotel: { main_photo_url?: string | null }) => hotel.main_photo_url ?? null)
    dealMocks.getStayDeals.mockResolvedValue([
      {
        id: 'deal-1',
        title: 'Nassau resort stay offer',
        deal_type: 'accommodation',
        island: 'nassau',
        resort_name: 'Ocean Club Resort',
        description: 'A limited stay offer for a Nassau beach resort.',
        price_from_usd: 399,
        price_unit: 'per_night',
        image_url: 'https://images.example/deal.jpg',
        highlights: ['Beachfront', 'Breakfast'],
        tags: ['Stay'],
        valid_through: null,
      },
    ])
  })

  test('renders compact inline search with a left sidebar filter model', async () => {
    const page = await StaysPage({
      searchParams: {
        island: 'Nassau',
        city: 'Paradise Island',
        type: 'Resort',
        traveler_type: 'families',
        stars: '5',
        guest_rating: '8',
        amenities: 'Pool,Beachfront',
        sort: 'stars',
        checkin: '2026-08-01',
        checkout: '2026-08-05',
        adults: '2',
        children: '1',
        rooms: '2',
      },
    })
    const { container } = render(page)

    const searchForm = screen.getByRole('form', { name: 'Search stays' })
    expect(within(searchForm).getByText('Inline stay search')).toBeInTheDocument()
    expect(searchForm).toHaveClass('border-gray-200')
    expect(searchForm).not.toHaveClass('border-brand-100')
    expect(within(searchForm).getByRole('button', { name: 'Search' })).toHaveClass('bg-brand-600')
    expect(screen.getByTestId('stay-primary-search-row')).toHaveClass('lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.15fr)_auto]')
    expect(screen.getByTestId('stay-detail-search-row')).toHaveClass('lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]')
    expect(searchForm.innerHTML).not.toContain('minmax(9rem,0.72fr)')
    expect(container.innerHTML).toMatch(/text-brand-700/)
    expect(container.innerHTML).toMatch(/bg-gold-400/)
    expect(container.innerHTML).not.toMatch(/border-gold|border-sand|bg-sand|ring-sand/)
    expect(screen.getByLabelText('Destination')).toHaveValue('Nassau')
    expect(screen.getByRole('button', { name: 'Open Destination menu' })).toHaveClass('border-gray-200')
    expect(screen.getByLabelText('Area')).toHaveValue('Paradise Island')
    expect(screen.getByRole('button', { name: 'Open Area menu' })).toHaveClass('border-gray-200')
    expect(screen.getByLabelText('Stay type')).toHaveValue('Resort')
    expect(screen.getByLabelText('Check-in')).toHaveValue('2026-08-01')
    expect(screen.getByLabelText('Check-out')).toHaveValue('2026-08-05')
    expect(screen.getByLabelText('Travelers')).toHaveValue('2')
    expect(screen.getByLabelText('Rooms')).toHaveValue('2')
    expect(container.querySelector('input[name="children"]')).toHaveValue('1')
    expect(container.querySelector('input[name="stars"]')).toHaveValue('5')
    expect(container.querySelector('input[name="guest_rating"]')).toHaveValue('8')
    expect(container.querySelector('input[name="traveler_type"]')).toHaveValue('families')
    expect(container.querySelector('input[name="amenities"]')).toHaveValue('Pool,Beachfront')

    const filters = screen.getByRole('complementary', { name: 'Stay filters' })
    expect(filters).toBeInTheDocument()
    expect(filters).toHaveClass('border-gray-200')
    expect(within(filters).getByText('7 types')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Stay results' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clear all' })).toHaveAttribute('href', '/stays')
    expect(screen.getByRole('link', { name: '5+ star' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: '5+ star' })).not.toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Paradise Island' })).toHaveAttribute('aria-current', 'true')
    expect(within(filters).getByRole('link', { name: 'Resort' })).toHaveAttribute('aria-current', 'true')
    expect(within(filters).getByRole('link', { name: 'House' })).toHaveAttribute('href', expect.stringContaining('type=House'))
    expect(within(filters).getByRole('link', { name: 'Apartment' })).toHaveAttribute('href', expect.stringContaining('type=Apartment'))
    expect(within(filters).getByRole('link', { name: 'Condo' })).toHaveAttribute('href', expect.stringContaining('type=Condo'))
    expect(screen.getByRole('link', { name: 'Families' })).toHaveAttribute('aria-current', 'true')

    const popularTypes = screen.getByRole('navigation', { name: 'Popular stay type shortcuts' })
    expect(popularTypes).toHaveClass('border-gray-200')
    expect(within(popularTypes).getByText('Jump straight to hotels, resorts, villas, homes, houses, apartments, or condos.')).toBeInTheDocument()
    expect(within(popularTypes).getByRole('link', { name: 'House' })).toHaveAttribute('href', expect.stringContaining('type=House'))
    expect(within(popularTypes).getByRole('link', { name: 'Condo' })).toHaveAttribute('href', expect.stringContaining('type=Condo'))

    expect(screen.getAllByText('Ocean Club Resort').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Why Buddy picked this')).toBeInTheDocument()
    expect(screen.getByText(/5-star Resort in Nassau/)).toBeInTheDocument()
    expect(screen.getByAltText('Ocean Club Resort')).toHaveAttribute('src', 'https://images.example/ocean-club.jpg')

    expect(hotelMocks.getHotels).toHaveBeenCalledWith({
      island: 'Nassau',
      city: 'Paradise Island',
      propertyType: 'Resort',
      travelerType: 'families',
      minStars: 5,
      minGuestRating: 8,
      amenities: ['Pool', 'Beachfront'],
      sort: 'stars',
    })
    expect(hotelMocks.getCityOptions).toHaveBeenCalledWith('Nassau')
    expect(hotelMocks.getFeaturedStayHotels).not.toHaveBeenCalled()
    expect(dealMocks.getStayDeals).toHaveBeenCalledWith(3)
  })

  test('defaults to featured starter islands with stay deals and FAQ', async () => {
    const page = await StaysPage({ searchParams: {} })
    render(page)

    expect(screen.getByRole('heading', { name: 'Best Bahamas stays to start with' })).toBeInTheDocument()
    expect(screen.getByText('Default stay feed')).toBeInTheDocument()
    expect(screen.getAllByText(/Nassau, Exuma, Harbour Island, Abaco, and Bimini/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('link', { name: 'Nassau' })).toHaveAttribute('href', '/stays?island=Nassau')
    expect(screen.getAllByRole('link', { name: 'Exuma' }).some((link) => link.getAttribute('href') === '/stays?island=Exuma')).toBe(true)
    expect(screen.getByRole('heading', { name: 'Bahamas stay offers worth checking' })).toBeInTheDocument()
    expect(screen.getByText('Nassau resort stay offer')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Stays FAQ' })).toBeInTheDocument()
    expect(screen.getByText('Can travelers filter by homes, villas, apartments, or hotels?')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Turn this stay shortlist into a Bahamas trip' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start stay trip' })).toHaveAttribute('href', '/dashboard/trips/new?returnTo=%2Fstays&source=stay')
    expect(screen.getByRole('link', { name: 'Start stay trip' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Compare starred stays' })).toHaveAttribute('href', '/stays?sort=stars')
    expect(screen.getByRole('link', { name: 'Review stay deals' })).toHaveAttribute('href', '/deals?type=accommodation')
    expect(screen.getByRole('link', { name: 'Ask Buddy' })).toHaveAttribute('href', '/dashboard/chat?q=Help+me+compare+Bahamas+stays')
    expect(screen.queryByText('Chat with Baha Buddy')).not.toBeInTheDocument()

    expect(hotelMocks.getFeaturedStayHotels).toHaveBeenCalledWith(6)
    expect(hotelMocks.getHotels).not.toHaveBeenCalled()
    expect(hotelMocks.getCityOptions).toHaveBeenCalledWith(undefined)
    expect(dealMocks.getStayDeals).toHaveBeenCalledWith(3)
  })
})
