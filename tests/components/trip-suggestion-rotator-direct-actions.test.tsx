import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import TripSuggestionRotator from '@/components/trip/TripSuggestionRotator'
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

function chip(label: string): HTMLAnchorElement {
  return screen.getByRole('link', { name: label })
}

describe('TripSuggestionRotator direct actions', () => {
  test('new trips use direct weather, Explore, and stays chips before chat', () => {
    render(<TripSuggestionRotator trip={trip()} hasItinerary={false} />)

    expect(chip('Check weather')).toHaveAttribute('href', '/dashboard#weather')
    expect(chip('Help me pack').getAttribute('href')).toContain('/dashboard/chat?')

    fireEvent.click(screen.getByRole('button', { name: 'Next suggestion' }))

    expect(chip('Things to do')).toHaveAttribute(
      'href',
      '/explore/places?island=the-exumas&category=Activity',
    )
    expect(chip('Hidden gems')).toHaveAttribute(
      'href',
      '/explore/places?island=the-exumas&search=hidden+gems+local+favorites',
    )
    expect(chip('Plan first days').getAttribute('href')).toContain('/dashboard/chat?')

    fireEvent.click(screen.getByRole('button', { name: 'Next suggestion' }))

    expect(chip('Find places to stay')).toHaveAttribute(
      'href',
      '/stays?island=Exuma&sort=stars&checkin=2026-08-01&checkout=2026-08-05&adults=2&rooms=1',
    )
    expect(chip('Stay by the beach')).toHaveAttribute(
      'href',
      '/stays?island=Exuma&sort=stars&checkin=2026-08-01&checkout=2026-08-05&adults=2&rooms=1&amenities=Beachfront',
    )
    expect(chip('Best areas').getAttribute('href')).toContain('/dashboard/chat?')
  })

  test('planned trips route flights, activities, stays, and budget directly', () => {
    render(<TripSuggestionRotator trip={trip({ status: 'planned' })} hasItinerary />)

    expect(chip('Swap a hotel')).toHaveAttribute(
      'href',
      '/stays?island=Exuma&sort=stars&checkin=2026-08-01&checkout=2026-08-05&adults=2&rooms=1',
    )
    expect(chip('Add activities')).toHaveAttribute(
      'href',
      '/explore/places?island=the-exumas&category=Activity',
    )
    expect(chip('Tighten the schedule').getAttribute('href')).toContain('/dashboard/chat?')

    fireEvent.click(screen.getByRole('button', { name: 'Next suggestion' }))

    expect(chip('Find flights')).toHaveAttribute(
      'href',
      '/flights?destination=EXU&tripType=round_trip&depart=2026-08-01&return=2026-08-05&passengers=2&cabin=economy',
    )
    expect(chip('Getting around').getAttribute('href')).toContain('/dashboard/chat?')

    fireEvent.click(screen.getByRole('button', { name: 'Next suggestion' }))

    expect(chip('Review budget')).toHaveAttribute('href', '/trip/trip-123#budget')
    expect(chip('Save on activities')).toHaveAttribute(
      'href',
      '/explore/places?island=the-exumas&search=best+value+activities',
    )
  })

  test('booked trips route on-island discovery to direct surfaces', () => {
    render(<TripSuggestionRotator trip={trip({ status: 'booked', islands: ['Grand Bahama'] })} hasItinerary />)

    expect(chip('Check weather')).toHaveAttribute('href', '/dashboard#weather')
    expect(chip('Help me pack').getAttribute('href')).toContain('/dashboard/chat?')

    fireEvent.click(screen.getByRole('button', { name: 'Next suggestion' }))

    expect(chip('Day trips')).toHaveAttribute(
      'href',
      '/explore/places?island=grand-bahama&search=day+trips&category=Activity',
    )
    expect(chip('Dinner picks')).toHaveAttribute('href', '/restaurants?island=Grand+Bahama')
    expect(chip('Beach picks')).toHaveAttribute(
      'href',
      '/explore/places?island=grand-bahama&search=best+beaches&category=Beach',
    )
  })
})
