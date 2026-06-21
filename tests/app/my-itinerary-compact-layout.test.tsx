import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import MyItineraryPage from '@/app/my-itinerary/[id]/page'

vi.mock('@/components/Footer', () => ({
  default: () => <footer>Marketplace footer</footer>,
}))

vi.mock('@/components/ChatWidget', () => ({
  default: () => null,
}))

function expectNoDecorativeInnerPageChrome(container: HTMLElement) {
  expect(container.innerHTML).not.toMatch(/DefaultHeaderHero|bg-gradient-brand|min-h-\[|py-20|py-24/)
  expect(container.innerHTML).not.toMatch(/border-sand|bg-sand|ring-sand|bg-offwhite|shadow-card/)
  expect(container.innerHTML).not.toMatch(/border-gold|ring-gold/)
}

describe('my itinerary compact handoff page', () => {
  test('uses compact marketplace layout with direct trip actions', async () => {
    const page = await MyItineraryPage({
      params: Promise.resolve({ id: 'order-123' }),
    })
    const { container } = render(page)

    expect(screen.getByRole('heading', { name: 'Your cruise day plan is being prepared.' })).toBeInTheDocument()
    expect(screen.getByText('Order reference order-123')).toBeInTheDocument()
    expect(screen.getByText('Mobile Live Guide handoff')).toBeInTheDocument()
    expect(screen.getByText('Ship-return buffer')).toBeInTheDocument()

    const createTripLinks = screen.getAllByRole('link', { name: 'Create related trip' })
    expect(createTripLinks).toHaveLength(2)
    for (const link of createTripLinks) {
      const href = link.getAttribute('href') ?? ''
      expect(href).toContain('/dashboard/trips/new?')
      expect(href).toContain('returnTo=%2Fmy-itinerary%2Forder-123')
      expect(href).toContain('source=guided_itinerary')
      expect(href).toContain('seed=Guided+Nassau+cruise+day+itinerary+order-123')
      expect(link).toHaveClass('bg-brand-600')
      expect(link.querySelector('.bg-gold-400')).toBeInTheDocument()
    }

    expect(screen.getByRole('link', { name: 'Browse guided days' })).toHaveAttribute(
      'href',
      '/nassau-cruise-itineraries',
    )
    expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute('href', '/contact')
    expect(screen.getByText('Baha Buddy is preparing the usable trip view.')).toBeInTheDocument()
    expect(screen.getByText('Confirmed stops with photos and source details')).toBeInTheDocument()
    expect(screen.getByText('A clear action to open the same day in the mobile app')).toBeInTheDocument()

    expect(container.innerHTML).not.toContain('/dashboard/chat')
    expect(container.innerHTML).not.toContain('cruise_day_orders')
    expectNoDecorativeInnerPageChrome(container)
  })
})
