import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import HeroSection from '@/components/HeroSection'

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
  test('uses marketplace navigation, direct search, and gold-accent product paths above the fold', () => {
    const { container } = render(<HeroSection slides={slides} />)

    expect(screen.getByRole('heading', { name: /Plan, book, and travel the Bahamas with Buddy/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Travel products' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Plan a Trip' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Stays' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Flights' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Things to Do' })).toBeInTheDocument()

    const startPlanning = screen.getByRole('link', { name: 'Start planning' })
    expect(startPlanning).toHaveClass('bg-brand-600')
    expect(startPlanning).toHaveClass('text-white')

    const productCards = [
      screen.getByRole('link', { name: /Stays Hotels, villas, homes/i }),
      screen.getByRole('link', { name: /Flights Live fares to the islands/i }),
      screen.getByRole('link', { name: /Explore Food, tours, beaches/i }),
    ]

    for (const card of productCards) {
      expect(card).toHaveClass('bg-white/12')
      expect(card.querySelector('.bg-gold-400')).toBeTruthy()
    }

    expect(container.querySelector('.bg-brand-600')).toBeTruthy()
    expect(container.querySelector('.text-gold-400')).toBeTruthy()
  })
})
