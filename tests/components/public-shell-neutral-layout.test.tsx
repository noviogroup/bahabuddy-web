import { readFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import Footer from '@/components/Footer'
import MarketplacePublicHeader from '@/components/marketplace/MarketplacePublicHeader'
import { BahaLogo } from '@/components/ui'

vi.mock('@/components/StoreBadgeLinks', () => ({
  default: () => <div data-testid="store-badges" />,
}))

describe('public marketplace shell brand layout', () => {
  test('public header uses a white account row and blue product nav with Baha yellow icon accents', () => {
    const { container } = render(<MarketplacePublicHeader activePath="/destinations" />)
    const header = container.querySelector('header')

    expect(header).toHaveClass('bg-white')
    expect(header).not.toHaveClass('border-brand-700')
    expect(header).not.toHaveClass('shadow-sm')
    expect(header).not.toHaveClass('backdrop-blur')
    expect(header?.className).not.toMatch(/gradient/)

    const logoLink = screen.getByRole('link', { name: 'Baha Buddy home' })
    const logoShell = container.querySelector('a[aria-label="Baha Buddy home"] > span')
    expect(logoLink.className).not.toMatch(/rounded|border|bg-|gradient|ring|shadow/)
    expect(logoShell).not.toHaveClass('bg-white')
    expect(logoShell).not.toHaveClass('shadow-md')
    expect(logoShell).not.toHaveClass('rounded-full')
    expect(logoShell?.className).not.toMatch(/rounded|border|bg-|gradient|ring|shadow/)
    const logoImage = logoLink.querySelector('img')
    expect(logoImage?.getAttribute('src')).toContain('baha-logo-mark.svg')
    expect(logoImage?.getAttribute('src')).not.toContain('logo.png')
    expect(logoImage?.className).not.toMatch(/bg-|border|gradient|ring|rounded/)

    expect(screen.getByRole('link', { name: 'Start planning' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Start planning' })).toHaveClass('text-white')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveClass('bg-white')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveClass('text-brand-700')

    const nav = screen.getByRole('navigation', { name: 'Travel products' })
    expect(nav).toHaveClass('bg-brand-600')
    const primaryLinks = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[data-nav-level="primary"]'))
    const productLabels = primaryLinks.map((link) => link.textContent?.trim())
    expect(productLabels).toEqual([
      'Stays',
      'Flights',
      'Explore',
      'Destinations',
      'Guides',
      'Deals',
      'Concierge',
    ])
    expect(primaryLinks.map((link) => link.textContent)).not.toContain('Restaurants')

    const stays = within(nav).getByRole('link', { name: 'Stays' })
    expect(stays).toHaveClass('text-white/90')
    expect(stays.querySelector('.text-gold-400')).toBeInTheDocument()

    const explore = within(nav).getByRole('link', { name: 'Explore' })
    expect(explore).toHaveAttribute('aria-haspopup', 'menu')
    expect(within(nav).getByRole('menuitem', { name: /Things to do/i })).toHaveAttribute('href', '/explore/places?category=Activity')
    expect(within(nav).getByRole('menuitem', { name: /Landmarks/i })).toHaveAttribute('href', '/explore/places?search=landmark+historic+site')
    expect(within(nav).getByRole('menuitem', { name: /Food and restaurants/i })).toHaveAttribute('href', '/explore/places?category=Dining')
    expect(within(nav).getByRole('menuitem', { name: /^Tours\b/i })).toHaveAttribute('href', '/explore/places?category=Activity&search=tour')

    const destinations = within(nav).getByRole('link', { name: 'Destinations' })
    expect(destinations).toHaveAttribute('aria-current', 'page')
    expect(destinations).toHaveAttribute('aria-haspopup', 'menu')
    expect(destinations).toHaveClass('bg-white/12')
    expect(destinations).toHaveClass('after:bg-gold-400')
    expect(within(nav).getByRole('menuitem', { name: /Nassau/i })).toHaveAttribute('href', '/explore/island/nassau-paradise-island')
    expect(within(nav).getByRole('menuitem', { name: /The Exumas/i })).toHaveAttribute('href', '/explore/island/the-exumas')
    expect(within(nav).getByRole('menuitem', { name: /Long Island/i })).toHaveAttribute('href', '/explore/island/long-island')
    expect(within(nav).getByRole('menuitem', { name: /Cat Island/i })).toHaveAttribute('href', '/destinations?island=Cat+Island')
    expect(within(nav).getByRole('menuitem', { name: /Ragged Island/i })).toHaveAttribute('href', '/destinations?island=Ragged+Island')
  })

  test('public header active states follow traveler intent groups', () => {
    const { rerender } = render(<MarketplacePublicHeader activePath="/restaurants" />)
    let nav = screen.getByRole('navigation', { name: 'Travel products' })
    expect(within(nav).getByRole('link', { name: 'Explore' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Destinations' })).not.toHaveAttribute('aria-current')

    rerender(<MarketplacePublicHeader activePath="/explore/island/the-exumas" />)
    nav = screen.getByRole('navigation', { name: 'Travel products' })
    expect(within(nav).getByRole('link', { name: 'Destinations' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Explore' })).not.toHaveAttribute('aria-current')
  })

  test('authenticated header keeps account actions on the white account row', () => {
    const { container } = render(<MarketplacePublicHeader userEmail="traveler@example.com" />)
    const header = container.querySelector('header')

    expect(header).toHaveClass('bg-white')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass('text-white')
    expect(screen.getByRole('link', { name: 'Profile for traveler@example.com' })).toHaveClass('border-brand-200')
  })

  test('Baha logo keeps caller classes on the outer shell, not behind the mark', () => {
    render(<BahaLogo href="/" className="mx-auto max-w-full" />)

    const logoLink = screen.getByRole('link', { name: 'Baha Buddy' })
    const logoImage = logoLink.querySelector('img')

    expect(logoLink).toHaveClass('mx-auto')
    expect(logoLink).toHaveClass('max-w-full')
    expect(logoImage).not.toHaveClass('mx-auto')
    expect(logoImage).not.toHaveClass('max-w-full')
    expect(logoImage?.className).not.toMatch(/bg-|border|gradient|ring|rounded/)
  })

  test('Baha logo mark asset has no baked-in border, gradient, or shadow layer', () => {
    const svg = readFileSync('public/brand/baha-logo-mark.svg', 'utf8')

    expect(svg).not.toMatch(/<linearGradient|<radialGradient|filter=|drop-shadow|box-shadow|stroke=|opacity=/i)
    expect(svg).toContain('fill="#0679DA"')
    expect(svg).toContain('fill="#FDC736"')
    expect(svg).toContain('fill="#02ABF1"')
  })

  test('footer renders as a white sitemap footer with no emoji copy', () => {
    const { container } = render(<Footer />)
    const footer = container.querySelector('footer')

    expect(footer).toHaveClass('bg-white')
    expect(footer).toHaveClass('border-gray-200')
    expect(footer).not.toHaveClass('bg-brand-600')

    expect(screen.getByRole('navigation', { name: 'Travel products' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Stay types' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Stays' })).toHaveClass('text-gray-600')
    expect(screen.getByRole('link', { name: 'Guides' })).toHaveAttribute('href', '/guides')
    expect(screen.getByRole('link', { name: 'Guided tours' })).toHaveAttribute('href', '/nassau-cruise-itineraries')
    expect(screen.getByRole('link', { name: 'Nassau' })).toHaveAttribute('href', '/explore/island/nassau-paradise-island')
    expect(screen.getByRole('link', { name: 'Houses' })).toHaveAttribute('href', '/stays?type=House')
    expect(screen.getByRole('link', { name: 'Condos' })).toHaveAttribute('href', '/stays?type=Condo')
    expect(screen.getByRole('link', { name: 'How Baha Buddy works' })).toHaveAttribute('href', '/how-it-works')
    expect(screen.getByText('Built for Bahamas travelers everywhere.')).toBeInTheDocument()
    expect(container.textContent).not.toContain('❤️')
  })
})
