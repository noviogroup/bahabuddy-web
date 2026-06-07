import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import TravelDocumentLeadForm from '@/components/revenue/TravelDocumentLeadForm'

export const metadata: Metadata = {
  title: 'Concierge Trip Plan',
  description:
    'Upgrade your AI-generated Bahamas itinerary into a polished Concierge Trip Plan reviewed by the Baha Buddy local travel team.',
}

const tiers = [
  {
    id: 'quick_review',
    name: 'Quick Review',
    price: '$49',
    description: 'Best for travelers who already have an AI itinerary and want a fast local review.',
    features: ['Improve an existing itinerary', 'Local practicality check', 'Dining and activity refinements', 'Delivered by email or dashboard'],
    cta: 'Pay $49 now',
  },
  {
    id: 'concierge_trip_plan',
    name: 'Concierge Trip Plan',
    price: '$149',
    description: 'The recommended launch offer for 3-5 day Bahamas trips.',
    features: ['Custom 3-5 day itinerary', 'Island selection guidance', 'Hotel, activity, dining, and transfer suggestions', 'Budget estimate and seasonal notes', 'Travel-document checklist where relevant'],
    cta: 'Pay $149 now',
    featured: true,
  },
  {
    id: 'full_planning_support',
    name: 'Full Planning Support',
    price: '$299',
    description: 'For travelers who want itinerary planning plus booking assistance handoff.',
    features: ['Everything in Concierge Trip Plan', 'Booking assistance handoff', 'Transfer and tour coordination support', 'Baha Visa / document support referral', 'Priority follow-up'],
    cta: 'Pay $299 now',
  },
]

const flow = [
  'Choose your concierge planning level and pay securely with Stripe.',
  'Receive confirmation and submit your travel details after payment.',
  'The Baha Buddy team refines the itinerary with local context.',
  'Receive the polished plan in your dashboard and/or by email.',
  'Get optional booking, transfer, activity, and visa-service handoffs.',
]

const included = [
  '3-5 day itinerary structure',
  'Island fit recommendation',
  'Hotel and stay suggestions',
  'Dining and nightlife suggestions',
  'Tours, beaches, cultural stops, and activities',
  'Estimated budget range',
  'Weather and seasonal planning notes',
  'Airport arrival and transfer guidance',
  'Visa/travel-document checklist where relevant',
  'Optional handoff to booking or Baha Visa support',
]

const bestFor = [
  'First-time visitors',
  'Families',
  'Honeymooners',
  'Group trips',
  'Luxury travelers',
  'Multi-island trips',
]

const localReviewReasons = [
  'Some islands require flight, ferry, or charter planning.',
  'Weather, seasonality, and transfer timing can change the best itinerary.',
  'Not every beach, tour, or dining option fits every traveler or group size.',
  'Local review helps make the plan more practical before money is spent on bookings.',
]

export default function ConciergeTripPlanPage({
  searchParams,
}: {
  searchParams?: { submitted?: string; checkout?: string }
}) {
  const submitted = searchParams?.submitted
  const cancelled = searchParams?.checkout === 'cancelled'

  return (
    <main className="min-h-screen bg-offwhite">
      <section className="relative overflow-hidden bg-gradient-brand text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_35%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 lg:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              Baha Buddy Concierge
            </p>
            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Pay today. Get your Bahamas trip reviewed by a local team.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-brand-50 leading-relaxed max-w-2xl">
              Start with Buddy's AI trip planning, then upgrade to a secure paid concierge review
              with practical recommendations for islands, hotels, activities, dining,
              transportation, budget, and travel documents.
            </p>
            {cancelled && (
              <div className="mt-6 rounded-baha-lg bg-white/15 border border-white/20 p-4 text-white text-sm font-semibold">
                Checkout was cancelled. You can choose an offer below and try again whenever ready.
              </div>
            )}
            {submitted === 'documents' && (
              <div className="mt-6 rounded-baha-lg bg-white/15 border border-white/20 p-4 text-white text-sm font-semibold">
                Travel-document request received. The Baha Visa team can now follow up.
              </div>
            )}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-brand-700 font-bold shadow-card hover:bg-brand-50 transition-colors"
              >
                Choose a paid plan
              </a>
              <Link
                href="/dashboard/chat?intent=concierge"
                className="inline-flex items-center justify-center rounded-full border border-white/60 px-7 py-3 text-white font-bold hover:bg-white/10 transition-colors"
              >
                Build my trip with Buddy first
              </Link>
            </div>
            <p className="mt-4 text-sm text-brand-50/90">
              Payments are processed securely through Stripe. No manual invoice is required.
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="max-w-6xl mx-auto px-4 py-14 lg:py-20">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">Immediate checkout</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-night">
            Choose your concierge planning level.
          </h2>
          <p className="mt-4 text-charcoal leading-relaxed">
            Select an offer below and pay immediately with card, Apple Pay, Google Pay, Link, or other Stripe-supported methods when available.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`rounded-baha-xl border p-6 shadow-card bg-white ${
                tier.featured ? 'border-gold-300 ring-2 ring-gold-100' : 'border-sand-200'
              }`}
            >
              {tier.featured && (
                <p className="mb-4 inline-flex rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-gold-800">
                  Recommended launch offer
                </p>
              )}
              <h2 className="text-xl font-extrabold text-night">{tier.name}</h2>
              <p className="mt-2 text-4xl font-extrabold text-brand-700">{tier.price}</p>
              <p className="mt-3 text-sm text-charcoal leading-relaxed">{tier.description}</p>
              <ul className="mt-5 space-y-3 text-sm text-charcoal">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-palm-100 text-palm-700 text-xs font-bold">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <form method="POST" action="/api/concierge-checkout" className="mt-6">
                <input type="hidden" name="offer_id" value={tier.id} />
                <input type="hidden" name="source" value="concierge_page" />
                <button
                  type="submit"
                  className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 font-bold transition-colors ${
                    tier.featured
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                  }`}
                >
                  {tier.cta}
                </button>
              </form>
              <p className="mt-3 text-center text-xs text-gray-400">Secure checkout powered by Stripe.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-sand-200">
        <div className="max-w-6xl mx-auto px-4 py-14 lg:py-20 grid lg:grid-cols-2 gap-10">
          <div>
            <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">How it works</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-night">
              A simple flow from payment to polished plan.
            </h2>
            <ol className="mt-7 space-y-4">
              {flow.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-charcoal leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-baha-xl bg-sand-50 border border-sand-200 p-6 lg:p-8">
            <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">What is included</p>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              {included.map((item) => (
                <div key={item} className="rounded-baha-md bg-white border border-sand-200 p-4 text-sm text-charcoal shadow-soft">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14 lg:py-20 grid lg:grid-cols-2 gap-8">
        <div className="rounded-baha-xl bg-white border border-sand-200 p-6 lg:p-8 shadow-card">
          <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">Why local review matters</p>
          <h2 className="mt-3 text-3xl font-extrabold text-night">AI starts the plan. Local context protects the trip.</h2>
          <div className="mt-6 space-y-3">
            {localReviewReasons.map((reason) => (
              <div key={reason} className="flex gap-3 text-sm text-charcoal leading-relaxed">
                <span className="mt-0.5 text-palm-600 font-bold">✓</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
          <div className="mt-7">
            <p className="text-sm font-bold text-night mb-3">Best for:</p>
            <div className="flex flex-wrap gap-2">
              {bestFor.map((item) => (
                <span key={item} className="rounded-full bg-brand-50 text-brand-700 px-3 py-1.5 text-xs font-bold">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-baha-xl bg-gradient-brand text-white p-6 lg:p-8 shadow-card">
          <p className="text-sm font-bold text-brand-50 uppercase tracking-wide">Sample itinerary preview</p>
          <h2 className="mt-3 text-3xl font-extrabold">Example 4-day Bahamas plan</h2>
          <div className="mt-6 space-y-3">
            {[
              ['Day 1', 'Arrival in Nassau, beach reset, local dinner, optional nightlife.'],
              ['Day 2', 'Exuma day trip, swimming pigs, sandbar stop, island lunch.'],
              ['Day 3', 'Culture, food, shopping, beach club, or family-friendly activity.'],
              ['Day 4', 'Slow morning, final dining recommendation, airport transfer timing.'],
            ].map(([day, detail]) => (
              <div key={day} className="rounded-baha-lg bg-white/10 border border-white/15 p-4">
                <p className="font-extrabold text-gold-200">{day}</p>
                <p className="mt-1 text-sm text-white/85 leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-14 lg:pb-20">
        <div className="rounded-baha-xl bg-night text-white p-8 lg:p-10">
          <div className="grid lg:grid-cols-[1fr_0.9fr] gap-8 items-start">
            <div>
              <p className="text-gold-300 font-bold mb-2">Travel document cross-sell</p>
              <h2 className="text-3xl font-extrabold mb-3">Need visa or travel-document help?</h2>
              <p className="text-white/80 leading-relaxed max-w-2xl">
                Concierge Trip Plan customers can be routed into Baha Visa and Baha Global Group for
                Bahamas visa support, travel-document checklists, work-permit inquiries, residence
                support, group travel documentation, and corporate travel support.
              </p>
            </div>
            <TravelDocumentLeadForm />
          </div>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  )
}
