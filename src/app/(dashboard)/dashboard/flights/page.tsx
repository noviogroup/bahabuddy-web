import FlightBookingClient from '@/app/flights/FlightBookingClient'

/**
 * /dashboard/flights — authenticated flight booking workbench.
 *
 * The public front-end route is /flights. This dashboard route exists so
 * logged-in users and internal testers can access the same booking flow
 * without colliding with the public page.
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard flights | Baha Buddy',
  description:
    'Authenticated flight search, rate verification, prebook, and booking through Baha Buddy.',
}

export default function DashboardFlightsPage() {
  return <FlightBookingClient />
}
