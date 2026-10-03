import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import PlacesBrowser from '@/components/PlacesBrowser'
import type { PublicPlace } from '@/lib/place-types'

const navigation = vi.hoisted(() => ({ search: '' }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
}))

const nassauActivity: PublicPlace = {
  id: 'approved-nassau',
  name: 'Approved Nassau activity',
  category: 'Activity',
  island: 'Nassau',
  island_id: 'nassau-paradise-island',
  description: 'Approved, but on a different island.',
  image_url: null,
  tags: ['culture'],
  rating: null,
  review_count: null,
  amenities: null,
  price_range: null,
  short_description: null,
  enriched_at: null,
  source_type: 'approved_activity',
}

const mayaguanaDining: PublicPlace = {
  id: 'mayaguana-dining',
  name: 'Mayaguana dining record',
  category: 'Dining',
  island: 'Mayaguana',
  island_id: 'mayaguana',
  description: 'Not an activity.',
  image_url: null,
  tags: ['food'],
  rating: null,
  review_count: null,
  amenities: null,
  price_range: null,
  short_description: null,
  enriched_at: null,
  source_type: 'canonical',
}

const eleutheraBeach: PublicPlace = {
  ...mayaguanaDining,
  id: 'eleuthera-beach',
  name: 'French Leave Beach',
  category: 'Beach',
  island: 'Eleuthera & Harbour Island',
  island_id: 'eleuthera-harbour-island',
  description: 'Quiet beach near Governor’s Harbour.',
  tags: ['beach'],
}

describe('PlacesBrowser approved activity empty state', () => {
  beforeEach(() => {
    navigation.search = ''
  })

  test('does not reset a zero-coverage island/category to all inventory', () => {
    navigation.search = 'island=mayaguana&category=Activity'
    const { container } = render(
      <PlacesBrowser
        places={[nassauActivity, mayaguanaDining]}
        allIslands={['Nassau', 'Mayaguana']}
        allCategories={['Activity', 'Dining']}
      />,
    )

    expect(screen.getByRole('heading', { name: 'No activity listings found' })).toBeInTheDocument()
    expect(screen.getByText(/We don't have activity listings for Mayaguana yet/)).toBeInTheDocument()
    expect(screen.queryByText('Approved Nassau activity')).not.toBeInTheDocument()
    expect(screen.queryByText('Mayaguana dining record')).not.toBeInTheDocument()
    expect(container).not.toHaveTextContent(/source-approved|approved .* inventory|unverified record/i)
  })

  test('a canonical island slug selects the matching island option', () => {
    navigation.search = 'island=eleuthera-harbour-island'
    render(
      <PlacesBrowser
        places={[eleutheraBeach, mayaguanaDining]}
        allIslands={['Eleuthera & Harbour Island', 'Mayaguana']}
        allCategories={['Beach', 'Dining']}
      />,
    )

    expect(screen.getByRole('button', { name: 'Eleuthera & Harbour Island' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByText('French Leave Beach').length).toBeGreaterThan(0)
    expect(screen.queryByText('Mayaguana dining record')).not.toBeInTheDocument()
  })

  test('a requested island with no listings stays visible and selected in the filter', () => {
    navigation.search = 'island=ragged-island'
    render(
      <PlacesBrowser
        places={[eleutheraBeach, mayaguanaDining]}
        allIslands={['Eleuthera & Harbour Island', 'Mayaguana']}
        allCategories={['Beach', 'Dining']}
      />,
    )

    expect(screen.getByRole('button', { name: 'Ragged Island' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All islands' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { name: 'No places found' })).toBeInTheDocument()
  })

  test('match=exact keeps an island category tile to its own category', () => {
    const eleutheraAttraction: PublicPlace = {
      ...eleutheraBeach,
      id: 'eleuthera-hermitage',
      name: 'Eleuthera hilltop viewpoint',
      category: 'Activity',
      source_type: 'canonical_attraction',
    }
    const canonicalBeach: PublicPlace = { ...eleutheraBeach, source_type: 'canonical_attraction' }
    navigation.search = 'island=eleuthera-harbour-island&category=Activity&match=exact'
    render(
      <PlacesBrowser
        places={[eleutheraAttraction, canonicalBeach]}
        allIslands={['Eleuthera & Harbour Island']}
        allCategories={['Activity', 'Beach']}
      />,
    )

    expect(screen.getAllByText('Eleuthera hilltop viewpoint').length).toBeGreaterThan(0)
    expect(screen.queryByText('French Leave Beach')).not.toBeInTheDocument()
  })
})
