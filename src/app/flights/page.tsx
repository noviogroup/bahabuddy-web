import FlightBookingClient from './FlightBookingClient'

/**
 * /flights — public front-end flight booking page.
 *
 * This page is visible on the front end. It uses Baha Buddy API routes so the
 * live booking provider key remains server-side.
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Search and book flights | Baha Buddy',
  description:
    'Search live flight options, verify rates, prebook, and book flights through Baha Buddy.',
}

export default function PublicFlightsPage() {
  return <FlightBookingClient />
}
