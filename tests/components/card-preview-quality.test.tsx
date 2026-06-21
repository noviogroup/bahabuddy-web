import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import PlacesBrowser, { type Place } from '@/components/PlacesBrowser'
import { HotelResultsList } from '@/components/hotels/HotelResultViews'
import type { CardData } from '@/components/RichCards'

const mockNavigation = vi.hoisted(() => ({
  search: '',
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockNavigation.search),
}))

describe('card preview quality', () => {
  beforeEach(() => {
    mockNavigation.search = ''
  })

  test('legacy hotel result cards link to canonical stays detail routes', () => {
    const hotel: CardData = {
      card_type: 'hotel',
      place_id: 'lp6558fbc7',
      name: 'Grand Isle Resort',
      island: 'Exuma',
      stars: 5,
      rating: 4.6,
      review_count: 220,
      price_per_night: 520,
      primary_image_url: 'https://images.example/grand-isle-primary.jpg',
      photo: 'https://images.example/generic-fallback.jpg',
      amenities: ['Beachfront', 'Pool'],
    }

    render(<HotelResultsList results={[hotel]} mode="list" />)

    expect(screen.getByRole('link', { name: 'View details for Grand Isle Resort' })).toHaveAttribute(
      'href',
      '/stays/lp6558fbc7',
    )
    expect(screen.getByAltText('Grand Isle Resort')).toHaveAttribute(
      'src',
      'https://images.example/grand-isle-primary.jpg',
    )
    expect(screen.getByText('Why Buddy picked this')).toBeInTheDocument()
    expect(screen.getByText(/5-star stay profile/i)).toBeInTheDocument()
    expect(screen.queryByText('Photo pending')).not.toBeInTheDocument()
  })

  test('legacy hotel result cards show photo pending instead of decorative fallback art', () => {
    const hotel: CardData = {
      card_type: 'hotel',
      place_id: 'no-photo-stay',
      name: 'No Photo Stay',
      island: 'Exuma',
      stars: 4,
      rating: 4.2,
      review_count: 41,
      price_per_night: 280,
    }

    render(<HotelResultsList results={[hotel]} mode="list" />)

    expect(screen.getByText('Photo pending')).toBeInTheDocument()
    expect(screen.getByText('Stay details are available. Provider photo is not available yet.')).toBeInTheDocument()
    expect(screen.queryByAltText('No Photo Stay')).not.toBeInTheDocument()
  })

  test('explore place cards show honest image pending state and preview rationale', () => {
    const place: Place = {
      id: 'food-stop-1',
      name: 'Harbour Island Fish Fry',
      category: 'Dining',
      island: 'Harbour Island',
      description: 'Local seafood stop near the harbour.',
      image_url: null,
      tags: ['Seafood', 'Local'],
      rating: 4.7,
      review_count: 82,
      amenities: ['Outdoor seating'],
      price_range: '$$',
      short_description: 'Casual seafood and local plates.',
      enriched_at: '2026-06-19T00:00:00Z',
    }

    render(
      <PlacesBrowser
        places={[place]}
        allIslands={['Harbour Island']}
        allCategories={['Dining']}
      />,
    )

    expect(screen.getByText('Image pending')).toBeInTheDocument()
    expect(screen.getByText('Why Buddy picked this')).toBeInTheDocument()
    expect(screen.getByText(/Strong traveler rating/i)).toBeInTheDocument()
    expect(screen.queryByAltText('Harbour Island Fish Fry')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute(
      'href',
      '/explore/places/food-stop-1',
    )
    expect(screen.getByRole('link', { name: 'Add to trip' })).toHaveAttribute(
      'href',
      '/explore/places/food-stop-1#trip-actions',
    )
    expect(screen.getByRole('link', { name: 'Check availability' })).toHaveAttribute(
      'href',
      '/restaurants?island=Harbour+Island',
    )
    expect(screen.getByRole('link', { name: 'Ask Buddy' })).toHaveAttribute(
      'href',
      expect.stringContaining('/dashboard/chat?q='),
    )
  })

  test('explore place cards expose booking actions for bookable experience categories', () => {
    mockNavigation.search = 'tripId=trip-1&dayNumber=2&timeSlot=afternoon'
    const place: Place = {
      id: 'dive-tour-1',
      name: 'Exuma Reef Diving',
      category: 'Water Activity',
      island: 'Exuma',
      description: 'Guided reef diving tour.',
      image_url: null,
      tags: ['Diving', 'Tour'],
      rating: 4.4,
      review_count: 31,
      amenities: ['Guide'],
      price_range: '$$$',
      short_description: 'Dive with a local guide.',
      enriched_at: '2026-06-19T00:00:00Z',
    }

    render(
      <PlacesBrowser
        places={[place]}
        allIslands={['Exuma']}
        allCategories={['Water Activity']}
      />,
    )

    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute(
      'href',
      '/explore/places/dive-tour-1?tripId=trip-1&dayNumber=2&timeSlot=afternoon',
    )
    expect(screen.getByRole('link', { name: 'Add to trip' })).toHaveAttribute(
      'href',
      '/explore/places/dive-tour-1?tripId=trip-1&dayNumber=2&timeSlot=afternoon#trip-actions',
    )
    expect(screen.getByRole('link', { name: 'Check availability' })).toHaveAttribute(
      'href',
      '/explore/places/dive-tour-1?tripId=trip-1&dayNumber=2&timeSlot=afternoon#trip-actions',
    )
    expect(screen.getByRole('link', { name: 'Book' })).toHaveAttribute(
      'href',
      '/explore/places/dive-tour-1?tripId=trip-1&dayNumber=2&timeSlot=afternoon#trip-actions',
    )
    expect(screen.queryByRole('link', { name: 'Ask Buddy' })).not.toBeInTheDocument()
  })

  test('explore place search matches tags and category context from direct Things to Do links', () => {
    const places: Place[] = [
      {
        id: 'food-stop-1',
        name: 'Harbour Island Fish Fry',
        category: 'Dining',
        island: 'Harbour Island',
        description: 'Local harbour stop.',
        image_url: null,
        tags: ['Seafood', 'Local'],
        rating: 4.7,
        review_count: 82,
        amenities: ['Outdoor seating'],
        price_range: '$$',
        short_description: 'Casual local plates.',
        enriched_at: '2026-06-19T00:00:00Z',
      },
      {
        id: 'beach-1',
        name: 'Pink Sands Beach',
        category: 'Beach',
        island: 'Harbour Island',
        description: 'Long beach for swimming.',
        image_url: null,
        tags: ['Beach'],
        rating: null,
        review_count: null,
        amenities: null,
        price_range: null,
        short_description: null,
        enriched_at: null,
      },
    ]

    const { container } = render(
      <PlacesBrowser
        places={places}
        allIslands={['Harbour Island']}
        allCategories={['Beach', 'Dining']}
      />,
    )

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'seafood' } })

    expect(screen.getAllByText('Harbour Island Fish Fry').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Pink Sands Beach')).not.toBeInTheDocument()
    expect(screen.getAllByText(/1 place found/).length).toBeGreaterThanOrEqual(1)
    expect(container.innerHTML).toMatch(/text-brand-700/)
    expect(container.innerHTML).toMatch(/bg-gold-400/)
    expect(container.innerHTML).not.toMatch(/border-sand|bg-offwhite|ring-sand|border-gold/)
  })
})
