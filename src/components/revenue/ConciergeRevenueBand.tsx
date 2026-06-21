import Link from 'next/link'

const proofPoints = [
  'Local Bahamas review',
  '3-5 day polished itinerary',
  'Hotel, dining, activity, and transfer suggestions',
  'Travel-document guidance where relevant',
]

export default function ConciergeRevenueBand() {
  const createTripHref = `/dashboard/trips/new?${new URLSearchParams({
    returnTo: '/concierge-trip-plan',
    source: 'concierge',
    seed: 'Create a Bahamas trip first so Concierge can review the route, stays, food, activities, transfers, and document needs.',
  }).toString()}`

  return (
    <section className="border-y border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-14 lg:py-16">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-700">
              <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
              New revenue offer: Concierge Trip Plan
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-night tracking-tight mb-4">
              Let Buddy build the idea. Let our local team polish the trip.
            </h2>
            <p className="text-lg text-charcoal leading-relaxed max-w-2xl mb-6">
              Travelers can start with a free AI-generated Bahamas itinerary, then upgrade to a
              human-reviewed plan with practical island, hotel, dining, activity, transportation,
              budget, and travel-document recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/concierge-trip-plan"
                className="inline-flex items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-white font-semibold transition-colors hover:bg-brand-700"
              >
                View Concierge Trip Plan
              </Link>
              <Link
                href={createTripHref}
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-night font-semibold border border-gray-300 transition-colors hover:border-gray-400 hover:bg-gray-50"
              >
                Create trip first
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-baha-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-sm font-semibold text-brand-700">Recommended launch price</p>
                <p className="text-4xl font-extrabold text-night mt-1">$149</p>
              </div>
              <span className="rounded-full bg-palm-50 text-palm-700 px-3 py-1 text-xs font-bold">
                Fastest path to revenue
              </span>
            </div>
            <ul className="space-y-3">
              {proofPoints.map((point) => (
                <li key={point} className="flex gap-3 text-sm text-charcoal">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-baha-lg bg-gray-50 border border-gray-200 p-4 text-sm text-charcoal">
              Place this CTA after chat results, saved trips, Explore pages, and island guides to
              convert high-intent planning activity into paid concierge orders.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
