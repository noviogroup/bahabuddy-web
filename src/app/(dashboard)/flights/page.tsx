import FlightSearchClient from './FlightSearchClient'
import Link from 'next/link'

/**
 * /flights — direct flight search powered by Duffel.
 *
 * Parallel to the chat-mediated search_flights tool. Users who already
 * know what they want can search without conversational round-trips.
 *
 * Server shell handles metadata + an intro header. The form + result
 * rendering is a client component (FlightSearchClient) because it owns
 * form state, loading state, and async fetch lifecycle.
 *
 * Auth: handled by (dashboard) layout. API enforces it too.
 *
 * Booking handoff: this iteration is "search & browse". Live Duffel
 * offers are displayed but not yet bookable from this surface — full
 * order-creation (passenger details + payment) is a separate workstream.
 * For now, users who want to book a specific offer can ask Buddy
 * via the chat panel, which knows how to commit to trip_flights.
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Search flights | Baha Buddy',
  description:
    'Live flight prices to Nassau, Exuma, Eleuthera, and the rest of the Bahamas. Powered by Duffel.',
}

export default function FlightsSearchPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-12 space-y-6">
      {/* Inline back link — primary nav lives in the shell sidebar */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-night transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold text-night">Search flights</h1>
        <p className="text-sm text-gray-500 mt-1">
          Live prices from Duffel — same data Buddy uses, browse it directly.{' '}
          <Link href="/dashboard/chat" className="text-brand-600 hover:text-brand-700 underline-offset-2 hover:underline">
            Prefer to chat?
          </Link>
        </p>
      </header>

      <FlightSearchClient />
    </main>
  )
}
