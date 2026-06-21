import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import BookingsList from '@/components/BookingsList'
import TripStatusBadge from '@/components/TripStatusBadge'

describe('booking status cards', () => {
  test('booking cards expose status, provider, source, and trip action context', () => {
    render(
      <BookingsList
        bookings={[
          {
            id: 'flight-booking-1',
            tripId: 'trip-1',
            tripName: 'Summer Bahamas',
            type: 'flight',
            title: 'MIA -> NAS',
            subtitle: 'Bahamasair',
            dates: 'Jul 3, 2026',
            price: 345,
            currency: 'USD',
            priceQualifier: 'total',
            bookingReference: 'PNR123',
            status: 'confirmed',
            paymentStatus: 'paid',
            providerStatus: 'confirmed',
            provider: 'liteapi',
            sourceSurface: 'web',
          },
          {
            id: 'stay-booking-1',
            tripId: 'trip-2',
            tripName: 'Exuma Weekend',
            type: 'hotel',
            title: 'Grand Isle Resort',
            subtitle: 'Exuma',
            dates: 'Aug 1, 2026 -> Aug 4, 2026',
            price: 1260,
            currency: 'USD',
            priceQualifier: 'total',
            bookingReference: null,
            status: 'failed',
            paymentStatus: 'paid',
            providerStatus: 'failed',
            provider: 'liteapi',
            sourceSurface: 'web',
          },
        ]}
      />,
    )

    expect(screen.getByText(/2 bookings/)).toBeInTheDocument()
    expect(screen.getByText(/1 confirmed/)).toBeInTheDocument()
    expect(screen.getByText(/1 need review/)).toBeInTheDocument()

    const flightCard = screen.getByText('MIA -> NAS').closest('.rounded-2xl')
    expect(flightCard).not.toBeNull()
    expect(within(flightCard as HTMLElement).getByText('Flight')).toBeInTheDocument()
    expect(within(flightCard as HTMLElement).getByText('Confirmed')).toBeInTheDocument()
    expect(within(flightCard as HTMLElement).getByText('$345 total')).toBeInTheDocument()
    expect(within(flightCard as HTMLElement).getByText('PNR123', { exact: false })).toBeInTheDocument()
    expect(within(flightCard as HTMLElement).getByText('paid')).toBeInTheDocument()
    expect(within(flightCard as HTMLElement).getByText('web')).toBeInTheDocument()
    expect(within(flightCard as HTMLElement).getByRole('link', { name: 'View trip: Summer Bahamas' })).toHaveAttribute(
      'href',
      '/trip/trip-1',
    )

    const stayCard = screen.getByText('Grand Isle Resort').closest('.rounded-2xl')
    expect(stayCard).not.toBeNull()
    expect(within(stayCard as HTMLElement).getByText('Stay')).toBeInTheDocument()
    expect(within(stayCard as HTMLElement).getByText('Needs support')).toBeInTheDocument()
    expect(within(stayCard as HTMLElement).getByText('$1,260 total')).toBeInTheDocument()
    expect(within(stayCard as HTMLElement).getByText('Provider: LiteAPI')).toBeInTheDocument()
    expect(within(stayCard as HTMLElement).getByText('Booking needs support')).toBeInTheDocument()
    expect(within(stayCard as HTMLElement).getByText(/Do not book again yet/i)).toBeInTheDocument()
    expect(within(stayCard as HTMLElement).getByRole('link', { name: 'Contact support' })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:support@bahabuddy.com'),
    )
  })

  test('pending booking cards tell travelers to avoid duplicate purchases', () => {
    render(
      <BookingsList
        bookings={[
          {
            id: 'pending-flight-booking',
            tripId: 'trip-1',
            tripName: 'Nassau Weekend',
            type: 'flight',
            title: 'MIA -> NAS',
            subtitle: 'Bahamasair',
            dates: 'Jul 3, 2026',
            price: 345,
            currency: 'USD',
            priceQualifier: 'total',
            bookingReference: null,
            status: 'pending',
            paymentStatus: 'paid',
            providerStatus: 'pending',
            provider: 'liteapi',
            sourceSurface: 'web',
          },
        ]}
      />,
    )

    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Provider confirmation pending')).toBeInTheDocument()
    expect(screen.getByText(/avoid a duplicate purchase/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ask support to check' })).toHaveAttribute(
      'href',
      expect.stringContaining('pending-flight-booking'),
    )
  })

  test('empty booking state routes to direct marketplace surfaces', () => {
    render(<BookingsList bookings={[]} />)

    expect(screen.getByRole('heading', { name: 'No bookings yet' })).toBeInTheDocument()
    const browseStays = screen.getByRole('link', { name: 'Browse stays' })
    expect(browseStays).toHaveAttribute('href', '/stays')
    expect(browseStays).toHaveClass('bg-brand-600')
    expect(browseStays.querySelector('.bg-gold-400')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Compare flights' })).toHaveAttribute('href', '/flights')
    expect(screen.getByRole('link', { name: 'Compare flights' })).toHaveClass('border-gray-300')
    expect(document.body.innerHTML).not.toMatch(/bg-night|hover:bg-gray-900/)
  })

  test('cancelled trip status is not mislabeled as draft', () => {
    render(<TripStatusBadge status="cancelled" />)

    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
  })
})
