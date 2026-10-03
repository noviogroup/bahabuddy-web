import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import PlacesBrowser from '@/components/PlacesBrowser'
import TripStyleSortedList from '@/components/marketplace/TripStyleSortedList'
import UnifiedCatalogSearch from '@/components/search/UnifiedCatalogSearch'
import type { PublicPlace } from '@/lib/place-types'
import { TRIP_STYLES_STORAGE_KEY } from '@/lib/trip-styles'

const navigation = vi.hoisted(() => ({ search: '' }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
}))

vi.mock('@/components/marketplace/ImageWithSourcePolicy', () => ({
  default: ({ title }: { title: string }) => <div data-testid="place-image" aria-label={title} />,
}))

function place(id: string, name: string, extra: Partial<PublicPlace> = {}): PublicPlace {
  return {
    id,
    name,
    category: 'Beach',
    island: 'Nassau & Paradise Island',
    island_id: 'nassau-paradise-island',
    description: `${name} description.`,
    image_url: null,
    tags: [],
    rating: null,
    review_count: null,
    amenities: null,
    price_range: null,
    short_description: null,
    enriched_at: null,
    source_type: 'canonical',
    ...extra,
  }
}

const places = [
  place('cove', 'Quiet Cove', { trip_styles: ['romance'] }),
  place('splash', 'Splash Park', { trip_styles: ['family', 'beach-fun'] }),
  place('reef', 'Reef Dive', { trip_styles: ['adventure'] }),
  place('gone', 'Gone Grill', { trip_styles: ['family'], business_status: 'CLOSED_PERMANENTLY' }),
  place('paused', 'Paused Pier', { business_status: 'CLOSED_TEMPORARILY' }),
]

const cardNames = () => screen.getAllByRole('article').map((card) => within(card).getByRole('heading').textContent)

function renderBrowser() {
  return render(
    <PlacesBrowser places={places} allIslands={['Nassau & Paradise Island']} allCategories={['Beach']} />,
  )
}

describe('PlacesBrowser trip styles and status', () => {
  beforeEach(() => {
    navigation.search = ''
  })

  test('hides closed-for-good places and notes temporary closures', () => {
    renderBrowser()

    expect(cardNames()).toEqual(['Quiet Cove', 'Splash Park', 'Reef Dive', 'Paused Pier'])
    expect(screen.queryByText('Gone Grill')).not.toBeInTheDocument()
    const paused = screen.getAllByRole('article')[3]
    expect(within(paused).getByText('Temporarily closed')).toBeInTheDocument()
  })

  test('trip-style chips filter the grid by place trip_styles', () => {
    renderBrowser()

    const group = screen.getByText('Trip style').closest('div')!.parentElement!
    expect(within(group).getByRole('button', { name: 'Any style' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(group).getByRole('button', { name: 'Family' }))
    expect(cardNames()).toEqual(['Splash Park'])

    fireEvent.click(within(group).getByRole('button', { name: 'Adventure & water' }))
    expect(cardNames()).toEqual(['Splash Park', 'Reef Dive'])

    fireEvent.click(within(group).getByRole('button', { name: 'Any style' }))
    expect(cardNames()).toHaveLength(4)
  })

  test('a styles URL param seeds the chips', () => {
    navigation.search = 'styles=romance'
    renderBrowser()

    expect(screen.getByRole('button', { name: 'Romance & honeymoon' })).toHaveAttribute('aria-pressed', 'true')
    expect(cardNames()).toEqual(['Quiet Cove'])
  })

  test('with no chip on, a stored style orders matching places first after mount', async () => {
    window.localStorage.setItem(TRIP_STYLES_STORAGE_KEY, '["adventure"]')
    renderBrowser()

    await waitFor(() => expect(cardNames()[0]).toBe('Reef Dive'))
    expect(cardNames()).toHaveLength(4)
  })
})

describe('TripStyleSortedList', () => {
  const items = [
    { key: 'a', tripStyles: ['adventure'], node: <p>Alpha</p> },
    { key: 'b', tripStyles: ['romance'], priceTier: 'luxury', node: <p>Bravo</p> },
    { key: 'c', node: <p>Charlie</p> },
  ]
  const order = () => screen.getAllByRole('paragraph').map((node) => node.textContent)

  test('keeps server order without a stored style', () => {
    render(<TripStyleSortedList items={items} />)
    expect(order()).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  test('moves matching items first once the stored style is read', async () => {
    window.localStorage.setItem(TRIP_STYLES_STORAGE_KEY, '["romance"]')
    render(<TripStyleSortedList items={items} />)
    await waitFor(() => expect(order()).toEqual(['Bravo', 'Alpha', 'Charlie']))
  })
})

describe('UnifiedCatalogSearch trip styles', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ query: 'pink sand', results: [], count: 0 }),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('sends the stored styles with the search request', async () => {
    window.localStorage.setItem(TRIP_STYLES_STORAGE_KEY, '["family","beach-fun"]')
    render(<UnifiedCatalogSearch initialQuery="pink sand" />)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(fetch).toHaveBeenCalledWith(
      '/api/search/catalog?q=pink+sand&styles=beach-fun%2Cfamily',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
  })
})
