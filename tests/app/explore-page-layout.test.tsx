import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ExplorePage from '@/app/explore/page'

const sanityMocks = vi.hoisted(() => ({
  fetchArticles: vi.fn(),
  fetchSocialVideos: vi.fn(),
  fetchTravelerStories: vi.fn(),
}))

vi.mock('@/lib/sanity/queries', () => ({
  fetchArticles: sanityMocks.fetchArticles,
  fetchSocialVideos: sanityMocks.fetchSocialVideos,
  fetchTravelerStories: sanityMocks.fetchTravelerStories,
}))

vi.mock('@/components/Footer', () => ({
  default: () => <footer>Marketplace footer</footer>,
}))

vi.mock('@/components/ChatWidget', () => ({
  default: () => null,
}))

describe('ExplorePage branded marketplace layout', () => {
  beforeEach(() => {
    sanityMocks.fetchArticles.mockResolvedValue([])
    sanityMocks.fetchSocialVideos.mockResolvedValue([])
    sanityMocks.fetchTravelerStories.mockResolvedValue([])
  })

  test('renders public Explore with app-blue primary actions and no sand wrappers', async () => {
    const page = await ExplorePage()
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: 'Discover the Bahamas with Buddy' })).toBeInTheDocument()

    const browsePlaces = screen.getAllByRole('link', { name: 'Browse places' })[0]
    expect(browsePlaces).toHaveClass('bg-brand-600')

    const searchForm = container.querySelector('form[action="/explore/places"]')
    expect(searchForm).toHaveClass('border-gray-200')
    expect(searchForm).not.toHaveClass('border-sand-200')
    expect(screen.getByPlaceholderText('Search islands, beaches, food, tours, hotels, or transport')).toHaveClass('border-gray-200')
    expect(screen.getByPlaceholderText('Search islands, beaches, food, tours, hotels, or transport')).toHaveAttribute('name', 'search')
    expect(screen.getByRole('button', { name: 'Search' })).toHaveClass('bg-brand-600')

    const beachesCategory = screen.getByRole('link', { name: 'Beaches' })
    expect(beachesCategory).toHaveClass('border-gray-200')
    expect(beachesCategory).toHaveAttribute('href', '/explore/places?category=Beach')
    expect(screen.getByRole('link', { name: 'Food' })).toHaveAttribute('href', '/explore/places?category=Dining')
    expect(screen.getByRole('link', { name: 'Hotels' })).toHaveAttribute('href', '/stays?sort=stars')
    expect(screen.getByRole('link', { name: 'Transport' })).toHaveAttribute('href', '/flights')

    expect(container.innerHTML).not.toContain('/explore?category=Beaches')

    const nassauIslandCard = container
      .querySelector('a[href="/explore/island/nassau-paradise-island"]')
      ?.closest('article')
    expect(nassauIslandCard).toHaveClass('border-gray-200')
    expect(nassauIslandCard).not.toHaveClass('border-sand-200')

    const firstDetailAction = screen.getAllByRole('link', { name: 'View details' })[0]
    expect(firstDetailAction).toHaveClass('bg-brand-600')

    expect(screen.getByRole('heading', { name: 'Nearby Experiences' })).toBeInTheDocument()

    const availabilityLinks = screen.getAllByRole('link', { name: 'Check availability' })
    expect(availabilityLinks.some((link) => (
      link.getAttribute('href') === '/stays?island=Nassau&sort=stars'
    ))).toBe(true)

    const addToTripLinks = screen.getAllByRole('link', { name: 'Add to trip' })
    expect(addToTripLinks.some((link) => {
      const url = new URL(link.getAttribute('href') ?? '', 'https://bahabuddy.test')
      return url.pathname === '/dashboard/trips/new'
        && url.searchParams.get('returnTo') === '/explore/island/nassau-paradise-island'
        && url.searchParams.get('source') === 'explore'
        && (url.searchParams.get('seed') ?? '').includes('Nassau')
    })).toBe(true)

    const askBuddyLinks = screen.getAllByRole('link', { name: 'Ask Buddy' })
    expect(askBuddyLinks.some((link) => {
      const url = new URL(link.getAttribute('href') ?? '', 'https://bahabuddy.test')
      return url.pathname === '/dashboard/chat'
        && url.searchParams.get('q') === 'Help me plan around Nassau'
    })).toBe(true)

    expect(screen.queryByRole('link', { name: 'Start planning' })).not.toBeInTheDocument()
    const createTripFromExplore = screen.getByRole('link', { name: 'Create trip from Explore' })
    expect(createTripFromExplore).toHaveClass('bg-brand-600')
    const createTripUrl = new URL(createTripFromExplore.getAttribute('href') ?? '', 'https://bahabuddy.test')
    expect(createTripUrl.pathname).toBe('/dashboard/trips/new')
    expect(createTripUrl.searchParams.get('returnTo')).toBe('/explore')
    expect(createTripUrl.searchParams.get('source')).toBe('explore')

    const foodTrip = screen.getByRole('link', { name: 'Start food trip' })
    const foodTripUrl = new URL(foodTrip.getAttribute('href') ?? '', 'https://bahabuddy.test')
    expect(foodTripUrl.pathname).toBe('/dashboard/trips/new')
    expect(foodTripUrl.searchParams.get('returnTo')).toBe('/restaurants')
    expect(foodTripUrl.searchParams.get('source')).toBe('explore')

    const collectionStartTrips = screen.getAllByRole('link', { name: 'Start trip' })
    expect(collectionStartTrips.length).toBeGreaterThanOrEqual(3)
    expect(collectionStartTrips.some((link) => {
      const url = new URL(link.getAttribute('href') ?? '', 'https://bahabuddy.test')
      return url.pathname === '/dashboard/trips/new'
        && url.searchParams.get('returnTo') === '/explore/places?category=Beach'
        && url.searchParams.get('source') === 'explore'
    })).toBe(true)

    expect(container.innerHTML).not.toContain('/dashboard?q=Help me choose what to do in the Bahamas')
    expect(container.innerHTML).not.toContain('/dashboard?q=')

    const readArticle = screen.getAllByRole('link', { name: 'Read article' })[0]
    expect(readArticle).toHaveClass('border-gray-300')
    expect(screen.getAllByRole('link', { name: 'Start trip' }).some((link) => link.className.includes('bg-brand-600'))).toBe(true)

    expect(container.innerHTML).not.toContain('border-sand-200')
    expect(container.innerHTML).not.toContain('bg-offwhite')
  })
})
