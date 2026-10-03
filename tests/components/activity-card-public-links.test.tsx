import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ActivityCard } from '@/components/cards/ActivityCard'

const card = {
  place_id: '24600000-0000-4000-8000-000000000101',
  name: 'Nassau / New Providence Historic & Landmark Guided Tour',
  island: 'nassau-paradise-island',
  island_id: 'nassau-paradise-island',
  description: 'Self-guided walk past forts and landmarks.',
  source_as_of_label: 'Source checked 2026-09-26',
  source_url: 'https://example.invalid/tour',
}

describe('ActivityCard public links', () => {
  test('shows the island name and links to the public detail page', () => {
    const { container } = render(<ActivityCard data={card} />)

    expect(screen.getByText('Nassau')).toBeInTheDocument()
    expect(container).not.toHaveTextContent('nassau-paradise-island')
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute(
      'href',
      '/explore/activities/24600000-0000-4000-8000-000000000101',
    )
  })

  test('announces the new-tab source link and omits it when there is no source', () => {
    const { rerender } = render(<ActivityCard data={card} size="detail" />)

    const source = screen.getByRole('link', { name: 'View source (opens in new tab)' })
    expect(source).toHaveAttribute('href', 'https://example.invalid/tour')
    expect(source).toHaveAttribute('target', '_blank')
    expect(source).toHaveAttribute('rel', 'noopener noreferrer')

    rerender(<ActivityCard data={{ ...card, website: 'https://example.invalid/operator' }} size="detail" />)
    expect(screen.getByRole('link', { name: 'Website (opens in new tab)' })).toHaveAttribute('target', '_blank')

    rerender(<ActivityCard data={{ ...card, source_url: ' ' }} size="detail" />)
    expect(screen.queryByRole('link', { name: /View source/ })).not.toBeInTheDocument()
  })
})
