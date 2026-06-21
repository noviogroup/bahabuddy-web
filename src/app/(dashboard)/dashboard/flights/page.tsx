import FlightSearchClient from '@/app/(dashboard)/flights/FlightSearchClient'

/**
 * /dashboard/flights — authenticated flight search and booking entry.
 *
 * The public front-end route is /flights. This dashboard route intentionally
 * reuses the same traveler-facing search, filter, and booking-card flow so
 * authenticated users do not fall into the obsolete provider workbench.
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Flights | Baha Buddy Dashboard',
  description:
    'Search live Bahamas flights, compare fares, and continue into the structured Baha Buddy booking flow.',
}

export default function DashboardFlightsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 text-night sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5 rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">
            Dashboard flights
          </p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-night md:text-3xl">
                Compare and book Bahamas flights
              </h1>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-gray-500">
                Search live fares here, then use each fare card to continue into the same structured traveler, passport, payment, and confirmation flow as the public site.
              </p>
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-700">
              LiteAPI fares
            </div>
          </div>
        </div>

        <FlightSearchClient />
      </section>
    </main>
  )
}
