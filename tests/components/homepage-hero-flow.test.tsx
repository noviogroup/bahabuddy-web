import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import HeroSection from '@/components/HeroSection'

const authMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
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
  }),
}))

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
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mediaMocks.play.mockClear()
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
      expect(video).toHaveAttribute(
        'src',
        expect.stringContaining('/assets/home/baha-buddy-hero-nassau-paradise-1080p.mp4#t=3'),
      )
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

  test('shows dashboard actions on the homepage hero for signed-in users', async () => {
    render(<HeroSection slides={slides} userEmail="valdez@noviogroup.com" userDisplayName="Valdez Williams" />)

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Profile for Valdez Williams' })).toBeInTheDocument()
    expect(screen.getByText('Hi, Valdez Williams')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('link', { name: 'Profile for Valdez Williams' })).toBeInTheDocument())
  })
})
