import FlightSearchClient from '@/app/(dashboard)/flights/FlightSearchClient'

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
  return (
    <main className="min-h-screen bg-offwhite px-4 py-10">
      <section className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-baha-lg bg-white p-6 shadow-soft border border-gray-100">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600">Flights</p>
          <h1 className="text-3xl font-extrabold text-night">Search and book Bahamas flights</h1>
          <p className="mt-2 text-sm text-gray-500">
            Compare live fares, verify the provider offer, then book through Baha Buddy.
          </p>
        </div>
        <FlightSearchClient />
      </section>
    </main>
  )
}
