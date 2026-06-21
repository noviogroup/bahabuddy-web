import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import DealsSection from '@/components/DealsSection'
import DestinationShowcase from '@/components/DestinationShowcase'
import ExploreTabs, { type DiscoverArticle, type SocialVideo } from '@/components/explore/ExploreTabs'

vi.mock('@/components/StoreBadgeLinks', () => ({
  default: () => <div data-testid="store-badges" />,
}))

describe('deal and explore card image policy', () => {
  test('live deal cards without provider media show image pending instead of guessed fallback art', () => {
    render(
      <DealsSection
        deals={[
          {
            id: 'live-deal-1',
            title: 'Cable Beach dining credit',
            deal_type: 'accommodation',
            island: 'nassau',
            resort_name: 'Cable Beach Resort',
            description: 'Stay three nights and receive a resort dining credit for two travelers.',
            price_from_usd: 299,
            price_unit: 'per_night',
            image_url: null,
            highlights: ['Dining credit', 'Beach access', 'Three nights'],
            tags: ['Hotel', 'Beach'],
            valid_through: null,
          },
        ]}
      />,
    )

    expect(screen.getByText('Image pending')).toBeInTheDocument()
    expect(screen.getByText('Deal details are available. Provider image is not available yet.')).toBeInTheDocument()
    expect(screen.queryByAltText('Cable Beach dining credit')).not.toBeInTheDocument()
    expect(screen.getByText('From $299/night')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Check stays' })).toHaveAttribute('href', '/stays?island=Nassau')
  })

  test('public explore article cards without editorial media show image pending with preview copy', () => {
    const articles: DiscoverArticle[] = [
      {
        slug: 'andros-blue-holes',
        title: 'Andros blue holes for first-time visitors',
        excerpt: 'How to choose a guide, what to bring, and when the water is calmest.',
        category: 'Adventure',
        readTime: '6 min',
        imageUrl: null,
        buddyPrompt: 'Tell me about blue holes in Andros.',
      },
    ]

    render(<ExploreTabs articles={articles} socialVideos={[]} travelerStories={[]} />)

    expect(screen.getByText('Image pending')).toBeInTheDocument()
    expect(screen.getByText('Article details are available. Editorial image is not available yet.')).toBeInTheDocument()
    expect(screen.queryByAltText('Andros blue holes for first-time visitors')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Read article' })).toHaveAttribute(
      'href',
      '/explore/articles/andros-blue-holes',
    )

    const startTripHref = screen.getByRole('link', { name: 'Start trip' }).getAttribute('href') ?? ''
    const startTripUrl = new URL(startTripHref, 'https://bahabuddy.test')
    expect(startTripUrl.pathname).toBe('/dashboard/trips/new')
    expect(startTripUrl.searchParams.get('returnTo')).toBe('/explore/articles/andros-blue-holes')
    expect(startTripUrl.searchParams.get('source')).toBe('article')
    expect(startTripUrl.searchParams.get('seed')).toBe('Tell me about blue holes in Andros.')
  })

  test('public explore community video cards start trips directly instead of chat prompts', () => {
    const videos: SocialVideo[] = [
      {
        id: 'exuma-reel',
        title: 'Sandbars and swimming pigs in one day',
        creator: '@bahamaslocal',
        platformLabel: 'Instagram',
        viewsLabel: '28K views',
        imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5',
        overlayClass: 'from-brand-900/30 via-brand-900/55 to-cyan-700/80',
        buddyPrompt: 'Build a day around Exuma sandbars and swimming pigs.',
      },
    ]

    render(<ExploreTabs articles={[]} socialVideos={videos} travelerStories={[]} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Community' }))

    const startTripHref = screen.getByRole('link', { name: 'Start from video' }).getAttribute('href') ?? ''
    const startTripUrl = new URL(startTripHref, 'https://bahabuddy.test')
    expect(startTripUrl.pathname).toBe('/dashboard/trips/new')
    expect(startTripUrl.searchParams.get('returnTo')).toBe('/explore')
    expect(startTripUrl.searchParams.get('source')).toBe('social_video')
    expect(startTripUrl.searchParams.get('seed')).toBe('Build a day around Exuma sandbars and swimming pigs.')
    expect(startTripHref).not.toContain('/dashboard/chat')
  })

  test('homepage destination cards without live place media show image pending', () => {
    render(
      <DestinationShowcase
        attractions={[
          {
            id: 'destination-1',
            name: 'Andros blue holes',
            category: 'Nature',
            island: 'Andros',
            description: 'Freshwater blue holes with local guides and a quiet island setting.',
            image_url: null,
            tags: ['Blue holes', 'Nature', 'Guided'],
          },
        ]}
      />,
    )

    expect(screen.getByText('Image pending')).toBeInTheDocument()
    expect(screen.getByText('Destination details are available. Place image is not available yet.')).toBeInTheDocument()
    expect(screen.queryByAltText('Andros blue holes')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan this trip →' })).toBeInTheDocument()
  })
})
