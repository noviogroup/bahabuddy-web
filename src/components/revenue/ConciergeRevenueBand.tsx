import Link from 'next/link'

const proofPoints = [
  'Local Bahamas review',
  '3-5 day polished itinerary',
  'Hotel, dining, activity, and transfer suggestions',
  'Travel-document guidance where relevant',
]

export default function ConciergeRevenueBand() {
  return (
    <section className="bg-sand-50 border-y border-sand-200">
      <div className="max-w-6xl mx-auto px-4 py-14 lg:py-16">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          <div>
            <p className="inline-flex items-center rounded-full bg-gold-100 text-gold-800 px-4 py-2 text-sm font-semibold mb-5">
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
                className="inline-flex items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-white font-semibold shadow-card hover:bg-brand-700 transition-colors"
              >
                View Concierge Trip Plan
              </Link>
              <Link
                href="/dashboard/chat"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-brand-700 font-semibold border border-brand-100 hover:border-brand-300 transition-colors"
              >
                Start with Buddy
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-baha-xl shadow-card border border-sand-200 p-6">
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
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-palm-100 text-palm-700 text-xs font-bold">
                    ✓
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-baha-lg bg-brand-50 border border-brand-100 p-4 text-sm text-brand-900">
              Place this CTA after chat results, saved trips, Explore pages, and island guides to
              convert high-intent planning activity into paid concierge orders.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
