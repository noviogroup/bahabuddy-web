import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import TravelerModeTabs from '@/components/home/TravelerModeTabs'

describe('TravelerModeTabs', () => {
  test('starts on the planning tab with a seeded trip action', () => {
    const { container } = render(<TravelerModeTabs />)

    expect(screen.getByRole('tablist', { name: 'Traveler status' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Planning a trip' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Already here' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('heading', { name: 'Pick the right island first.' })).toBeInTheDocument()
    expect(screen.getByText('Island')).toBeInTheDocument()
    expect(screen.getByText('Stay')).toBeInTheDocument()
    expect(screen.getByText('Flight')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Traveler planning a Bahamas trip on a quiet beach' })).toHaveAttribute(
      'src',
      expect.stringContaining('1763489614-1763489614.jpg'),
    )
    expect(container.querySelectorAll('#traveler-mode-panel-planning svg[aria-hidden="true"]')).toHaveLength(3)

    const startTrip = screen.getByRole('link', { name: 'Start a trip' })
    const url = new URL(startTrip.getAttribute('href') ?? '', 'https://bahabuddy.test')

    expect(url.pathname).toBe('/dashboard/trips/new')
    expect(url.searchParams.get('source')).toBe('homepage_traveler_mode')
    expect(url.searchParams.get('returnTo')).toBe('/')
    expect(url.searchParams.get('seed')).toContain('Plan a Bahamas trip')
  })

  test('switches to already-here actions', () => {
    render(<TravelerModeTabs />)

    fireEvent.click(screen.getByRole('tab', { name: 'Already here' }))

    expect(screen.getByRole('tab', { name: 'Already here' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Find what works today.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore nearby' })).toHaveAttribute(
      'href',
      '/explore?mode=already-here',
    )
    expect(screen.getByRole('link', { name: 'Find restaurants' })).toHaveAttribute('href', '/restaurants')
    expect(screen.getByRole('img', { name: 'Traveler walking Nassau waterfront near pastel buildings' })).toHaveAttribute(
      'src',
      expect.stringContaining('1763488599-1763488599.jpg'),
    )
  })

  test('switches to cruise-day actions', () => {
    const { container } = render(<TravelerModeTabs />)

    fireEvent.click(screen.getByRole('tab', { name: 'On a cruise' }))

    expect(screen.getByRole('tab', { name: 'On a cruise' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Dock. Explore. Return on time.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Plan day' })).toHaveAttribute(
      'href',
      '/nassau-cruise-day-planner',
    )
    expect(screen.getByRole('link', { name: 'View routes' })).toHaveAttribute('href', '/nassau-cruise-itineraries')
    expect(screen.getByText('Dock')).toBeInTheDocument()
    expect(screen.getByText('Nassau route')).toBeInTheDocument()
    expect(screen.getByText('Return')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Travelers walking from Nassau cruise port toward local shops' })).toHaveAttribute(
      'src',
      expect.stringContaining('nassau-cruise-port.jpg'),
    )
    expect(container.querySelectorAll('#traveler-mode-panel-cruise svg[aria-hidden="true"]')).toHaveLength(3)
    expect(screen.queryByText(/Turn ship times/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Nassau food')).not.toBeInTheDocument()
  })
})
