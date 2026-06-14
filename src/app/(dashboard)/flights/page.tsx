import FlightBookingClient from '@/app/flights/FlightBookingClient'

/**
 * /flights — live flight search, rate verification, prebook, and booking workbench.
 *
 * Auth is handled by the (dashboard) layout. Provider credentials stay server-side
 * inside /api/booking/flights/* routes.
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Book flights | Baha Buddy',
  description:
    'Search live flight options, verify rates, prebook, and confirm flights through Baha Buddy.',
}

export default function FlightsSearchPage() {
  return <FlightBookingClient />
}
