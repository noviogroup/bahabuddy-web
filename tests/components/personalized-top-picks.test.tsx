import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { FeaturedExperience } from '@/components/home/FeaturedExperiencesCarousel'
import PersonalizedTopPicks from '@/components/home/PersonalizedTopPicks'
import { TRIP_STYLES_STORAGE_KEY } from '@/lib/trip-styles'

const supabase = vi.hoisted(() => {
  const update = vi.fn()
  const updateEq = vi.fn(async () => ({ error: null }))
  const select = vi.fn()
  const profile = { trip_styles: [] as string[] }
  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null as null | { user: { id: string } } } })),
    },
    from: vi.fn(() => ({
      update: (values: unknown) => {
        update(values)
        return { eq: updateEq }
      },
      select: (columns: string) => {
        select(columns)
        return { eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }
      },
    })),
  }
  return { client, update, updateEq, select, profile }
})

vi.mock('@/lib/supabase/client', () => ({ createClient: () => supabase.client }))

function pick(index: number, tripStyles?: string[], priceTier?: string): FeaturedExperience {
  return {
    title: `Pick ${index}`,
    island: 'Nassau & Paradise Island',
    category: 'Attraction',
    href: `/explore/places/pick-${index}`,
    image: `https://images.example.com/pick-${index}.jpg`,
    badge: 'Top pick',
    ...(tripStyles ? { tripStyles } : {}),
    ...(priceTier ? { priceTier } : {}),
  }
}

// 24 picks in admin order: only #3 and #20 suit a family trip, #14 is a
// luxury-tier pick. #20 is outside the default 12 and must be promoted.
const picks: FeaturedExperience[] = Array.from({ length: 24 }, (_, index) => {
  const n = index + 1
  if (n === 3) return pick(n, ['family', 'beach-fun'], 'mid')
  if (n === 20) return pick(n, ['family'], 'value')
  if (n === 14) return pick(n, ['luxury', 'romance'], 'luxury')
  return pick(n, ['adventure'])
})

function renderShelf() {
  return render(
    <PersonalizedTopPicks
      experiences={picks}
      eyebrow="Top things to do"
      defaultTitle="Traveller favourites across The Bahamas."
      description="Beaches, boat days and island sights, ready for Buddy to plan."
    />,
  )
}

const shownTitles = () =>
  screen.getAllByTestId('featured-experience-card-title').map((node) => node.textContent)

describe('PersonalizedTopPicks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.profile.trip_styles = []
    supabase.client.auth.getSession.mockResolvedValue({ data: { session: null } })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('with no style chosen it shows the first 12 picks in admin order and the default heading', () => {
    renderShelf()

    expect(shownTitles()).toEqual(Array.from({ length: 12 }, (_, i) => `Pick ${i + 1}`))
    expect(screen.getByRole('heading', { name: 'Traveller favourites across The Bahamas.' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'What kind of trip?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Family' })).toHaveAttribute('aria-pressed', 'false')
    expect(window.localStorage.getItem(TRIP_STYLES_STORAGE_KEY)).toBeNull()
  })

  test('choosing a style re-ranks the picks, swaps the heading and persists the choice', () => {
    renderShelf()

    fireEvent.click(screen.getByRole('button', { name: 'Family' }))

    expect(screen.getByRole('button', { name: 'Family' })).toHaveAttribute('aria-pressed', 'true')
    const titles = shownTitles()
    expect(titles).toHaveLength(12)
    expect(titles.slice(0, 2)).toEqual(['Pick 3', 'Pick 20'])
    expect(screen.getByRole('heading', { name: 'Picks for your family trip' })).toBeInTheDocument()
    expect(window.localStorage.getItem(TRIP_STYLES_STORAGE_KEY)).toBe('["family"]')

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(shownTitles()).toEqual(Array.from({ length: 12 }, (_, i) => `Pick ${i + 1}`))
    expect(window.localStorage.getItem(TRIP_STYLES_STORAGE_KEY)).toBeNull()
  })

  test('restores a stored choice after mount', async () => {
    window.localStorage.setItem(TRIP_STYLES_STORAGE_KEY, '["luxury"]')
    renderShelf()

    await waitFor(() => expect(shownTitles()[0]).toBe('Pick 14'))
    expect(screen.getByRole('heading', { name: 'Picks for your luxury trip' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Luxury escape' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('signed-in travellers adopt their profile styles and save changes to their own row', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-test-key')
    supabase.client.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    supabase.profile.trip_styles = ['family']

    renderShelf()

    await waitFor(() => expect(shownTitles().slice(0, 2)).toEqual(['Pick 3', 'Pick 20']))
    expect(supabase.select).toHaveBeenCalledWith('trip_styles')
    expect(window.localStorage.getItem(TRIP_STYLES_STORAGE_KEY)).toBe('["family"]')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Adventure & water' }))
    })

    await waitFor(() => expect(supabase.update).toHaveBeenCalledWith({ trip_styles: ['family', 'adventure'] }))
    expect(supabase.updateEq).toHaveBeenCalledWith('id', 'user-1')
  })

  test('hides the picker when the picks carry no style data', () => {
    render(
      <PersonalizedTopPicks
        experiences={[pick(1), pick(2), pick(3)]}
        eyebrow="Top things to do"
        defaultTitle="Traveller favourites across The Bahamas."
        description="Beaches."
      />,
    )
    expect(screen.queryByTestId('trip-style-picker')).not.toBeInTheDocument()
    expect(shownTitles()).toEqual(['Pick 1', 'Pick 2', 'Pick 3'])
  })
})
