import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import UnifiedCatalogSearch from '@/components/search/UnifiedCatalogSearch'

vi.mock('@/components/marketplace/ImageWithSourcePolicy', () => ({
  default: ({ children, title }: { children?: React.ReactNode; title: string }) => (
    <div data-testid="search-result-image" aria-label={title}>{children}</div>
  ),
}))

const result = {
  id: 'pink-sands',
  type: 'attraction',
  title: 'Pink Sands Beach',
  subtitle: 'A three-mile pink sand beach.',
  islandSlug: 'eleuthera-harbour-island',
  islandName: 'Eleuthera & Harbour Island',
  category: 'Beach',
  imageUrl: 'https://images.example.com/pink-sands.jpg',
  rating: 4.8,
  reviewCount: 920,
  priceFromUsd: null,
  href: '/explore/places/pink-sands',
}

const islandResult = {
  id: 'the-exumas',
  type: 'island' as const,
  title: 'The Exumas',
  subtitle: 'Turquoise water, island hopping, and secluded cays.',
  islandSlug: 'the-exumas',
  islandName: 'The Exumas',
  category: 'Island guide',
  imageUrl: 'https://images.example.com/exumas.jpg',
  rating: null,
  reviewCount: null,
  priceFromUsd: null,
  href: '/explore/island/the-exumas',
}

describe('UnifiedCatalogSearch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ query: 'pink sand', results: [result], count: 1 }),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('searches an initial shareable query and renders accessible results', async () => {
    render(<UnifiedCatalogSearch initialQuery="pink sand" initialFilter="beaches" />)

    expect(screen.getByRole('search', { name: 'Search the Bahamas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beaches' })).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(fetch).toHaveBeenCalledWith(
      '/api/search/catalog?q=pink+sand&filter=beaches',
      expect.objectContaining({ credentials: 'same-origin' }),
    )

    expect(await screen.findByRole('heading', { name: 'Pink Sands Beach' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pink Sands Beach/i })).toHaveAttribute(
      'href',
      '/explore/places/pink-sands',
    )
    expect(screen.getByText('(920)')).toBeInTheDocument()
  })

  test('shows approved destination discovery before the visitor types', () => {
    render(<UnifiedCatalogSearch defaultResults={[islandResult]} />)

    expect(screen.getByRole('heading', { name: 'Explore all 16 island groups' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The Exumas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /The Exumas/i })).toHaveAttribute(
      'href',
      '/explore/island/the-exumas',
    )
    expect(screen.getByRole('button', { name: 'swimming pigs' })).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
})
