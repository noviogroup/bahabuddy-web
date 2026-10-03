import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import HeroSection, { shouldLoadHeroVideo } from '@/components/HeroSection'

const authMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  profileDisplayName: null as string | null,
}))

const mediaMocks = vi.hoisted(() => ({
  play: vi.fn<() => Promise<void>>(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: authMocks.getUser,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: { display_name: authMocks.profileDisplayName }, error: null }),
      }
      return query
    },
  }),
}))

/** jsdom has no layout: report which media queries match for this test. */
function mockMediaQueries(matching: string[]) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: matching.includes(query),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

const DESKTOP = '(min-width: 768px)'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

vi.mock('@/components/StoreBadgeLinks', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="store-badges" className={className} />
  ),
}))

const slides = [
  {
    slug: 'nassau-paradise-island',
    name: 'Nassau & Paradise Island',
    tagline: 'Easy arrivals, dining, beaches, and resort energy.',
    image: 'https://images.example.com/nassau.jpg',
  },
]

describe('Homepage hero flow', () => {
  beforeEach(() => {
    mediaMocks.play.mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(mediaMocks.play)
    authMocks.getUser.mockResolvedValue({ data: { user: null } })
    authMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: authMocks.unsubscribe } },
    })
    authMocks.unsubscribe.mockClear()
    authMocks.profileDisplayName = null
    mockMediaQueries([DESKTOP])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mediaMocks.play.mockClear()
    Reflect.deleteProperty(navigator, 'connection')
  })

  test('uses marketplace navigation and direct search without secondary hero cards', async () => {
    const { container } = render(<HeroSection slides={slides} />)

    expect(screen.getByRole('heading', { name: /Plan, book, and experience The Bahamas with Buddy/i })).toHaveClass(
      'text-5xl',
    )
    expect(screen.getByRole('navigation', { name: 'Travel products' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Plan a Trip' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Stays' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Flights' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Things to Do' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Transport' })).toBeInTheDocument()
    expect(screen.queryByText(/Browse stays, flights, tours, islands/i)).not.toBeInTheDocument()
    await waitFor(() => {
      const video = screen.getByTestId('hero-background-video')
      expect(video.tagName).toBe('VIDEO')
      // Light 720p encodes, WebM first; the 1080p master is no longer served.
      const sources = Array.from(video.querySelectorAll('source'))
      expect(sources.map((source) => [source.getAttribute('src'), source.getAttribute('type')])).toEqual([
        ['/assets/home/baha-buddy-hero-nassau-paradise-720p.webm', 'video/webm'],
        ['/assets/home/baha-buddy-hero-nassau-paradise-720p.mp4', 'video/mp4'],
      ])
      expect(video.outerHTML).not.toContain('1080p')
      expect(video).toHaveAttribute('preload', 'metadata')
      expect(video).not.toHaveAttribute('controls')
      expect(video).toHaveAttribute('controlsList', expect.stringContaining('nodownload'))
      expect(video).toHaveAttribute('controlsList', expect.stringContaining('noremoteplayback'))
      expect(video).toHaveAttribute('autoplay')
      expect(video).toHaveAttribute('muted')
      expect(video).toHaveAttribute('loop')
      expect(video).toHaveAttribute('playsinline')
      expect(video).toHaveAttribute('webkit-playsinline', 'true')
      expect((video as HTMLVideoElement).defaultMuted).toBe(true)
      expect(video).toHaveClass('object-cover')
      expect(video).toHaveAttribute('preload', 'metadata')
      expect(video).toHaveAttribute('poster', 'https://images.example.com/nassau.jpg')
      expect(container.querySelector('iframe[title="Baha Buddy homepage hero video background"]')).not.toBeInTheDocument()
    })
    await waitFor(() => expect(mediaMocks.play).toHaveBeenCalled())

    const playAttemptsBeforePause = mediaMocks.play.mock.calls.length
    fireEvent.pause(screen.getByTestId('hero-background-video'))
    await waitFor(() => expect(mediaMocks.play.mock.calls.length).toBeGreaterThan(playAttemptsBeforePause))
    expect(container.innerHTML).not.toContain('from-black/45')
    expect(container.innerHTML).not.toContain('from-night/70')

    const startPlanning = screen.getByRole('link', { name: 'Start planning' })
    expect(startPlanning).toHaveClass('bg-brand-600')
    expect(startPlanning).toHaveClass('text-white')
    await waitFor(() => expect(screen.getByRole('link', { name: 'Sign in' })).not.toHaveClass('opacity-70'))

    expect(screen.queryByRole('link', { name: /Stays Hotels, villas, homes/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Flights Live fares to the islands/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Explore Food, tours, beaches/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Need local review before you book/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Get a Concierge Trip Plan/i })).not.toBeInTheDocument()
    expect(screen.getByTestId('store-badges')).toBeInTheDocument()

    expect(container.querySelector('.bg-brand-600')).toBeTruthy()
    expect(container.querySelector('.text-gold-400')).toBeTruthy()
  })

  test.each([
    ['phones', [], undefined],
    ['reduced motion', [DESKTOP, REDUCED_MOTION], undefined],
    ['data saver', [DESKTOP], { saveData: true }],
  ])('keeps only the poster image for %s', async (_label, matching, connection) => {
    mockMediaQueries(matching)
    if (connection) Object.defineProperty(navigator, 'connection', { configurable: true, value: connection })

    const { container } = render(<HeroSection slides={slides} />)

    await waitFor(() => expect(screen.getByRole('link', { name: 'Sign in' })).not.toHaveClass('opacity-70'))
    expect(screen.queryByTestId('hero-background-video')).not.toBeInTheDocument()
    expect(container.querySelector('img[src="https://images.example.com/nassau.jpg"]')).toBeInTheDocument()
    expect(mediaMocks.play).not.toHaveBeenCalled()
  })

  test('optimises a local poster image', async () => {
    const { container } = render(
      <HeroSection slides={[{ ...slides[0], image: '/assets/tourism-partner/02-islands/01-nassau-paradise-island.webp' }]} />,
    )

    expect(container.querySelector('img')?.getAttribute('src')).toContain('/_next/image?url=')
    await waitFor(() => expect(screen.getByRole('link', { name: 'Sign in' })).not.toHaveClass('opacity-70'))
  })

  test('loads the signed-in greeting client-side, preferring the saved profile name', async () => {
    authMocks.profileDisplayName = 'Valdez W.'
    authMocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'valdez@noviogroup.com', user_metadata: { full_name: 'Valdez Williams' } } },
    })

    render(<HeroSection slides={slides} />)

    expect(await screen.findByRole('link', { name: 'Profile for Valdez W.' })).toBeInTheDocument()
    expect(screen.getByText('Hi, Valdez W.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
  })

  test('shows dashboard actions on the homepage hero for signed-in users', async () => {
    render(<HeroSection slides={slides} userEmail="valdez@noviogroup.com" userDisplayName="Valdez Williams" />)

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Profile for Valdez Williams' })).toBeInTheDocument()
    expect(screen.getByText('Hi, Valdez Williams')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('link', { name: 'Profile for Valdez Williams' })).toBeInTheDocument())
  })

  test('reads the signed-in profile display name on the client', async () => {
    authMocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'traveler@example.com', user_metadata: {} } },
    })
    authMocks.profileDisplayName = 'Island Traveler'

    render(<HeroSection slides={slides} />)

    await waitFor(() => expect(screen.getByText('Hi, Island Traveler')).toBeInTheDocument())
  })

  test('skips the hero video on phones, reduced motion, and data-saver connections', () => {
    const matchMedia = (matching: string[]) => ({
      matchMedia: (query: string) => ({ matches: matching.includes(query) }) as MediaQueryList,
    })

    expect(shouldLoadHeroVideo(matchMedia([DESKTOP]), undefined)).toBe(true)
    // Phones (min-width query does not match) never get the clip.
    expect(shouldLoadHeroVideo(matchMedia([]), undefined)).toBe(false)
    expect(shouldLoadHeroVideo(matchMedia(['(max-width: 767px)']), undefined)).toBe(false)
    expect(shouldLoadHeroVideo(matchMedia([DESKTOP, REDUCED_MOTION]), undefined)).toBe(false)
    expect(shouldLoadHeroVideo(matchMedia([DESKTOP]), { saveData: true })).toBe(false)
    expect(shouldLoadHeroVideo(matchMedia([DESKTOP]), { effectiveType: '3g' })).toBe(false)
    expect(shouldLoadHeroVideo(matchMedia([DESKTOP]), { effectiveType: '4g' })).toBe(true)
  })

  test('never renders the video element on a narrow viewport', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query === '(max-width: 767px)',
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
      }),
    })

    render(<HeroSection slides={slides} />)
    await waitFor(() => expect(authMocks.getUser).toHaveBeenCalled())
    expect(screen.queryByTestId('hero-background-video')).not.toBeInTheDocument()
  })
})
