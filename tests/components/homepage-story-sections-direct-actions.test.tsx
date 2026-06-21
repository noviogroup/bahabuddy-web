import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import HomepageStorySections from '@/components/home/HomepageStorySections'

vi.mock('@/components/StoreBadgeLinks', () => ({
  default: () => <div data-testid="store-badges" />,
}))

describe('HomepageStorySections direct actions', () => {
  test('hero story starts a seeded trip instead of routing to chat or generic dashboard', () => {
    render(<HomepageStorySections />)

    expect(screen.queryByRole('link', { name: 'Plan with Buddy' })).not.toBeInTheDocument()

    const startTrip = screen.getByRole('link', { name: 'Start this trip' })
    const href = startTrip.getAttribute('href') ?? ''
    const url = new URL(href, 'https://bahabuddy.test')

    expect(url.pathname).toBe('/dashboard/trips/new')
    expect(url.searchParams.get('returnTo')).toBe('/')
    expect(url.searchParams.get('source')).toBe('homepage')
    expect(url.searchParams.get('seed')).toContain('Five days in Exuma')
    expect(href).not.toContain('/dashboard/chat')
    expect(startTrip).toHaveClass('bg-brand-600')
    expect(startTrip.querySelector('.bg-gold-400')).toBeTruthy()
  })

  test('homepage story still exposes direct marketplace links', () => {
    const { container } = render(<HomepageStorySections />)
    const hrefs = Array.from(container.querySelectorAll('a')).map((link) => link.getAttribute('href'))

    expect(screen.getByRole('link', { name: 'Compare islands' })).toHaveAttribute('href', '/destinations')
    expect(hrefs).toContain('/stays?sort=stars')
    expect(hrefs).toContain('/explore')
    expect(hrefs).toContain('/how-it-works')
    expect(screen.getByRole('link', { name: 'View travel info' })).toHaveAttribute('href', '/how-it-works')
    expect(screen.getByRole('link', { name: 'Get concierge review' })).toHaveAttribute('href', '/concierge-trip-plan')
  })

  test('homepage marketplace lanes expose public direct travel actions before the deeper Buddy story', () => {
    const { container } = render(<HomepageStorySections />)

    expect(screen.getByRole('heading', { name: 'Everything starts as a real trip action.' })).toBeInTheDocument()
    expect(screen.getByText('Public visitors can explore first. Saving, checkout, booking, and trip changes wait until sign-in.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Stays Hotels, resorts, villas, homes/i })).toHaveAttribute('href', '/stays?sort=stars')
    expect(screen.getByRole('link', { name: /Flights Live Bahamas fares/i })).toHaveAttribute('href', '/flights')
    expect(screen.getByRole('link', { name: /Explore Islands, food, tours, beaches/i })).toHaveAttribute('href', '/explore')
    expect(screen.getByRole('link', { name: /Concierge Human-reviewed trip support/i })).toHaveAttribute('href', '/concierge-trip-plan')
    expect(screen.getByText('Compare stays')).toBeInTheDocument()
    expect(screen.getByText('Compare flights')).toBeInTheDocument()
    expect(screen.getByText('Open Explore')).toBeInTheDocument()
    expect(screen.getByText('Review Concierge')).toBeInTheDocument()
    expect(screen.getByAltText('Stays in The Bahamas')).toHaveAttribute('loading', 'eager')
    expect(screen.getByAltText('Flights in The Bahamas')).toHaveAttribute('loading', 'eager')
    expect(screen.getByAltText('Flights in The Bahamas')).toHaveAttribute(
      'src',
      expect.stringContaining('screenshot-2026-04-28-200148'),
    )
    expect(screen.getByAltText('Explore in The Bahamas')).toHaveAttribute('loading', 'eager')
    expect(screen.getByAltText('Concierge in The Bahamas')).toHaveAttribute('loading', 'eager')
    expect(container.innerHTML).not.toContain('/dashboard/chat')
  })
})
