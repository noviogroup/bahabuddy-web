import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import HomeCardCarousel from '@/components/home/HomeCardCarousel'
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
    budget_estimate: null,
    budget_actual: null,
    hero_image_url: null,
    created_at: '2026-06-19T00:00:00.000Z',
    updated_at: '2026-06-19T00:00:00.000Z',
    ...overrides,
  }
}

function cardLink(title: string): HTMLAnchorElement {
  const text = screen.getByText(title)
  const link = text.closest('a')
  if (!link) throw new Error(`No link found for card ${title}`)
  return link
}

describe('HomeCardCarousel direct actions', () => {
  test('new-user inspiration cards route to direct pages instead of chat-first prompts', () => {
    render(<HomeCardCarousel userState="new" primaryTrip={null} />)

    expect(cardLink('5-day island hopping')).toHaveAttribute(
      'href',
      '/dashboard/trips/new?source=home_card&destination=the-exumas&seed=5-day+island+hopping+with+stays%2C+flights%2C+food%2C+beaches%2C+and+a+relaxed+pace.',
    )
    expect(cardLink('Swim with the pigs')).toHaveAttribute(
      'href',
      '/explore/places?island=the-exumas&search=swimming+pigs+Big+Major+Cay&category=Activity',
    )
    expect(cardLink("Buddy's hidden gem")).toHaveAttribute('href', '/explore/island/long-island')
    expect(cardLink('Snorkel the reefs')).toHaveAttribute(
      'href',
      '/explore/places?search=snorkeling+reefs+family&category=Water+Activity',
    )
    expect(cardLink('Where the locals eat')).toHaveAttribute(
      'href',
      '/restaurants?island=Nassau&cuisine=Bahamian',
    )

    expect(cardLink('5-day island hopping').getAttribute('href')).not.toContain('/dashboard/chat')
    expect(cardLink('Swim with the pigs').getAttribute('href')).not.toContain('/dashboard/chat')
    expect(cardLink('Snorkel the reefs').getAttribute('href')).not.toContain('/dashboard/chat')
    expect(cardLink('Where the locals eat').getAttribute('href')).not.toContain('/dashboard/chat')
  })

  test('planner stay and flight cards route to direct marketplace pages', () => {
    render(<HomeCardCarousel userState="planner" primaryTrip={trip()} />)

    expect(cardLink('Flights from your city')).toHaveAttribute(
      'href',
      '/flights?destination=EXU&tripType=round_trip&depart=2026-08-01&return=2026-08-05&passengers=2&cabin=economy',
    )
    expect(cardLink('Top-rated hotels')).toHaveAttribute(
      'href',
      '/stays?island=Exuma&sort=stars&checkin=2026-08-01&checkout=2026-08-05&adults=2&rooms=1',
    )
    expect(cardLink('You might also like')).toHaveAttribute(
      'href',
      '/explore/places?island=Exuma&category=tours',
    )
  })

  test('planner marketplace cards do not send direct-action clicks back into chat', () => {
    render(<HomeCardCarousel userState="planner" primaryTrip={trip({ islands: ['Grand Bahama'], party_size: 4 })} />)

    expect(cardLink('Flights from your city').getAttribute('href')).toContain('/flights?')
    expect(cardLink('Flights from your city').getAttribute('href')).not.toContain('/dashboard/chat')
    expect(cardLink('Top-rated hotels').getAttribute('href')).toContain('/stays?')
    expect(cardLink('Top-rated hotels').getAttribute('href')).not.toContain('/dashboard/chat')
    expect(cardLink('You might also like').getAttribute('href')).toContain('/explore/places?')
    expect(cardLink('You might also like').getAttribute('href')).not.toContain('/dashboard/chat')
  })

  test('booked-trip marketplace cards use direct surfaces while keeping advice cards conversational', () => {
    render(<HomeCardCarousel userState="booked" primaryTrip={trip({ status: 'booked', islands: ['Grand Bahama'] })} />)

    expect(cardLink('7-day forecast')).toHaveAttribute('href', '/dashboard#weather')
    expect(cardLink('Must-do near your hotel')).toHaveAttribute(
      'href',
      '/explore/places?island=grand-bahama&search=nearby+tours+beaches+culture&category=Activity',
    )
    expect(cardLink('Where to eat')).toHaveAttribute('href', '/restaurants?island=Grand+Bahama')

    expect(cardLink('7-day forecast').getAttribute('href')).not.toContain('/dashboard/chat')
    expect(cardLink('Must-do near your hotel').getAttribute('href')).not.toContain('/dashboard/chat')
    expect(cardLink('Where to eat').getAttribute('href')).not.toContain('/dashboard/chat')

    expect(cardLink('What to pack').getAttribute('href')).toContain('/dashboard/chat')
    expect(cardLink('Pro tips from Buddy').getAttribute('href')).toContain('/dashboard/chat')
  })
})
