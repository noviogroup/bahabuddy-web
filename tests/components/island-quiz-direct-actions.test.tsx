import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import IslandQuiz from '@/components/IslandQuiz'

function choose(label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  fireEvent.click(screen.getByRole('button', { name: new RegExp(escapedLabel) }))
}

describe('IslandQuiz direct actions', () => {
  test('sends quiz results to trip creation first and keeps Buddy secondary', () => {
    const { container } = render(<IslandQuiz />)

    const startQuiz = screen.getByRole('button', { name: /start the quiz/i })
    expect(startQuiz).toHaveClass('bg-brand-600')
    expect(startQuiz.querySelector('.bg-gold-400')).not.toBeInTheDocument()

    fireEvent.click(startQuiz)
    choose('Brunch at the hottest new spot')
    choose('Candlelit table, ocean view, cocktails')
    choose('City lights + beach views')
    choose('Love the energy — more people, more fun')
    choose('The unexpected adventure')

    expect(screen.getByRole('heading', { name: 'Nassau' })).toBeInTheDocument()
    expect(screen.getByText('Your island match')).toBeInTheDocument()

    const startTrip = screen.getByRole('link', { name: 'Start my Nassau trip' })
    const startTripUrl = new URL(startTrip.getAttribute('href') ?? '', 'https://bahabuddy.test')
    expect(startTrip).toHaveClass('bg-brand-600')
    expect(startTrip.querySelector('.bg-gold-400')).not.toBeInTheDocument()
    expect(startTripUrl.pathname).toBe('/dashboard/trips/new')
    expect(startTripUrl.searchParams.get('returnTo')).toBe('/explore/quiz')
    expect(startTripUrl.searchParams.get('source')).toBe('island_quiz')
    expect(startTripUrl.searchParams.get('destination')).toBe('nassau-paradise-island')
    expect(startTripUrl.searchParams.get('result')).toBe('Nassau')
    expect(startTripUrl.searchParams.get('seed')).toContain('Plan me a trip to Nassau')
    expect(startTrip.getAttribute('href')).not.toContain('/dashboard/chat')

    expect(screen.getByRole('link', { name: 'Explore Nassau' })).toHaveAttribute(
      'href',
      '/explore/island/nassau-paradise-island',
    )

    const askBuddy = screen.getByRole('link', { name: 'Ask Buddy about this match' })
    const askBuddyUrl = new URL(askBuddy.getAttribute('href') ?? '', 'https://bahabuddy.test')
    expect(askBuddyUrl.pathname).toBe('/dashboard/chat')
    expect(askBuddyUrl.searchParams.get('q')).toContain('Plan me a trip to Nassau')

    expect(screen.getByRole('button', { name: 'Take quiz again' })).toBeInTheDocument()
    expect(container.textContent).not.toContain('↩')
  })
})
