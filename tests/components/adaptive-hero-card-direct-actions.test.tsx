import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import AdaptiveHeroCard from '@/components/home/AdaptiveHeroCard'
import type { Trip } from '@/types/database'

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-123',
    user_id: 'user-123',
    name: 'Trip to Exuma',
    status: 'planned',
    date_start: '2026-08-01',
    date_end: '2026-08-05',
    islands: ['Exuma'],
    party_type: 'couple',
    party_size: 2,
    budget_estimate: 3500,
    budget_actual: null,
    hero_image_url: null,
    created_at: '2026-06-20T00:00:00.000Z',
    updated_at: '2026-06-20T00:00:00.000Z',
    ...overrides,
  }
}

describe('AdaptiveHeroCard direct actions', () => {
  test('new-user hero creates a trip instead of starting chat', () => {
    render(<AdaptiveHeroCard trips={[]} />)

    const hero = screen.getByRole('link', { name: /Start with a Bahamas trip record/i })

    expect(hero).toHaveAttribute('href', '/dashboard/trips/new?source=dashboard_hero')
    expect(hero.getAttribute('href')).not.toContain('/dashboard/chat')
    expect(screen.getByText('Create trip')).toBeInTheDocument()
    expect(screen.queryByText('Start with Buddy')).not.toBeInTheDocument()
  })

  test('planner hero continues to the canonical trip record', () => {
    render(<AdaptiveHeroCard trips={[trip()]} />)

    expect(screen.getByRole('link', { name: /Your trip is taking shape/i })).toHaveAttribute(
      'href',
      '/trip/trip-123',
    )
  })

  test('booked hero opens the canonical trip record', () => {
    render(<AdaptiveHeroCard trips={[trip({
      status: 'booked',
      date_start: '2026-12-01',
      date_end: '2026-12-05',
    })]} />)

    expect(screen.getByRole('link', { name: /Trip to Exuma/i })).toHaveAttribute(
      'href',
      '/trip/trip-123',
    )
  })
})
