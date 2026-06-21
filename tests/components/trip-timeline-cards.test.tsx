import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import EmptySlotChatLink from '@/components/EmptySlotChatLink'
import TripTimelineCards from '@/components/trip/TripTimelineCards'
import type { Trip, TripAccommodation, TripActivity, TripFlight } from '@/types/database'

const trip: Trip = {
  id: 'trip-1',
  user_id: 'user-1',
  name: 'Exuma Summer',
  status: 'planned',
  date_start: null,
  date_end: null,
  islands: ['Exuma'],
  party_type: 'couple',
  party_size: 2,
  budget_estimate: 3500,
  budget_actual: null,
  hero_image_url: null,
  created_at: '2026-06-19T00:00:00Z',
  updated_at: '2026-06-19T00:00:00Z',
}

describe('TripTimelineCards', () => {
  test('empty trip readiness cards use direct marketplace actions before chat', () => {
    render(
      <TripTimelineCards
        trip={trip}
        flights={[]}
        accommodations={[]}
        activities={[]}
        primaryIsland="Exuma"
      />,
    )

    expect(screen.getByText('Trip readiness')).toBeInTheDocument()
    expect(screen.getByText('Flight needed')).toBeInTheDocument()
    expect(screen.getByText('Stay needed')).toBeInTheDocument()
    expect(screen.getByText('Days need plans')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Compare flights' })).toHaveAttribute('href', '/flights')
    expect(screen.getByRole('link', { name: 'Find a stay' })).toHaveAttribute('href', '/stays?island=Exuma')
    expect(screen.getByRole('link', { name: 'Browse experiences' })).toHaveAttribute(
      'href',
      '/explore/places?island=Exuma',
    )
    expect(screen.queryByText(/Keep planning with Buddy/i)).not.toBeInTheDocument()
  })

  test('timeline cards expose decision facts for flights, stays, activities, and gaps', () => {
    const datedTrip = { ...trip, date_start: '2026-08-01', date_end: '2026-08-01' }
    const flights: TripFlight[] = [
      {
        id: 'flight-1',
        trip_id: 'trip-1',
        origin: 'MIA',
        destination: 'NAS',
        departure_at: '2026-08-01T09:00:00Z',
        arrival_at: '2026-08-01T10:05:00Z',
        airline: 'Bahamasair',
        booking_reference: 'ABC123',
        price: 420,
        created_at: '2026-06-19T00:00:00Z',
      },
    ]
    const accommodations: TripAccommodation[] = [
      {
        id: 'stay-1',
        trip_id: 'trip-1',
        name: 'Grand Isle Resort',
        island: 'Exuma',
        check_in: '2026-08-01',
        check_out: '2026-08-04',
        price_per_night: 520,
        guests: 2,
        booking_reference: null,
        created_at: '2026-06-19T00:00:00Z',
      },
    ]
    const activities: TripActivity[] = [
      {
        id: 'activity-1',
        trip_id: 'trip-1',
        day_number: 1,
        time_slot: 'morning',
        activity_name: 'Private Exuma Cays boat tour',
        activity_type: 'Tour',
        notes: 'Start early to avoid the crowded sandbar window.',
        sort_order: 0,
        created_at: '2026-06-19T00:00:00Z',
      },
    ]

    render(
      <TripTimelineCards
        trip={datedTrip}
        flights={flights}
        accommodations={accommodations}
        activities={activities}
        primaryIsland="Exuma"
      />,
    )

    expect(screen.getByText('MIA to NAS')).toBeInTheDocument()
    expect(screen.getByText('Bahamasair')).toBeInTheDocument()
    expect(screen.getByText('Booked')).toBeInTheDocument()
    expect(screen.getByText('$420')).toBeInTheDocument()
    expect(screen.getByText('Grand Isle Resort')).toBeInTheDocument()
    expect(screen.getByText('Saved stay')).toBeInTheDocument()
    expect(screen.getByText('$520/night')).toBeInTheDocument()
    expect(screen.getByText('Private Exuma Cays boat tour')).toBeInTheDocument()
    expect(screen.getByText('Start early to avoid the crowded sandbar window.')).toBeInTheDocument()
    expect(screen.getByText('Add to Day 1 Afternoon')).toBeInTheDocument()
  })
})

describe('EmptySlotChatLink', () => {
  test('uses Explore as the primary action and Buddy as the secondary action', () => {
    render(<EmptySlotChatLink tripId="trip-1" dayNumber={2} slot="evening" tripName="Exuma Summer" island="Exuma" />)

    expect(screen.getByRole('link', { name: 'Browse and add' })).toHaveAttribute(
      'href',
      '/explore/places?island=Exuma&tripId=trip-1&dayNumber=2&timeSlot=evening&category=food_culture',
    )
    expect(screen.getByRole('link', { name: 'Browse and add' }).getAttribute('href')).not.toContain('/dashboard/chat')

    const askBuddy = screen.getByRole('link', { name: 'Ask Buddy' })
    const askBuddyUrl = new URL(askBuddy.getAttribute('href') ?? '', 'https://bahabuddy.test')
    expect(askBuddyUrl.pathname).toBe('/dashboard/chat')
    expect(askBuddyUrl.searchParams.get('q')).toBe(
      'For my "Exuma Summer" trip, suggest something good for Day 2 evening on Exuma.',
    )
  })
})
