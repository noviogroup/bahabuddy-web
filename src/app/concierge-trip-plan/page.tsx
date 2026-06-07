import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'

export const metadata: Metadata = {
  title: 'Concierge Trip Plan',
  description:
    'Upgrade your AI-generated Bahamas itinerary into a polished Concierge Trip Plan reviewed by the Baha Buddy local travel team.',
}

const tiers = [
  {
    name: 'Quick Review',
    price: '$49',
    description: 'Best for travelers who already have an AI itinerary and want a fast local review.',
    features: ['Improve an existing itinerary', 'Local practicality check', 'Dining and activity refinements', 'Delivered by email or dashboard'],
    cta: 'Request quick review',
  },
  {
    name: 'Concierge Trip Plan',
    price: '$149',
    description: 'The recommended launch offer for 3-5 day Bahamas trips.',
    features: ['Custom 3-5 day itinerary', 'Island selection guidance', 'Hotel, activity, dining, and transfer suggestions', 'Budget estimate and seasonal notes', 'Travel-document checklist where relevant'],
    cta: 'Start concierge plan',
    featured: true,
  },
  {
    name: 'Full Planning Support',
    price: '$299',
    description: 'For travelers who want itinerary planning plus booking assistance handoff.',
    features: ['Everything in Concierge Trip Plan', 'Booking assistance handoff', 'Transfer and tour coordination support', 'Baha Visa / document support referral', 'Priority follow-up'],
    cta: 'Request full planning',
  },
]

const flow = [
  'Create or describe your Bahamas trip idea with Buddy.',
  'Choose your review or concierge planning level.',
  'Share your dates, budget, group size, and preferences.',
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

export default function ConciergeTripPlanPage() {
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
              Turn your Bahamas trip idea into a polished local itinerary.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-brand-50 leading-relaxed max-w-2xl">
              Start with Buddy's AI trip planning, then let our local travel team refine your plan
              with practical recommendations for islands, hotels, activities, dining,
              transportation, budget, and travel documents.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/chat?intent=concierge"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-brand-700 font-bold shadow-card hover:bg-brand-50 transition-colors"
              >
                Build my trip with Buddy
              </Link>
              <a
                href="mailto:hello@bahabuddy.com?subject=Concierge%20Trip%20Plan%20Request"
                className="inline-flex items-center justify-center rounded-full border border-white/60 px-7 py-3 text-white font-bold hover:bg-white/10 transition-colors"
              >
                Request concierge help
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14 lg:py-20">
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
              <a
                href={`mailto:hello@bahabuddy.com?subject=${encodeURIComponent(tier.name)}%20Request`}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 font-bold transition-colors ${
                  tier.featured
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                }`}
              >
                {tier.cta}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-sand-200">
        <div className="max-w-6xl mx-auto px-4 py-14 lg:py-20 grid lg:grid-cols-2 gap-10">
          <div>
            <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">How it works</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-night">
              A simple flow from AI plan to paid concierge review.
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

      <section className="max-w-6xl mx-auto px-4 py-14 lg:py-20">
        <div className="rounded-baha-xl bg-night text-white p-8 lg:p-10 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="text-gold-300 font-bold mb-2">Travel document cross-sell</p>
            <h2 className="text-3xl font-extrabold mb-3">Need visa or travel-document help?</h2>
            <p className="text-white/80 leading-relaxed max-w-2xl">
              Concierge Trip Plan customers can be routed into Baha Visa and Baha Global Group for
              Bahamas visa support, travel-document checklists, work-permit inquiries, residence
              support, group travel documentation, and corporate travel support.
            </p>
          </div>
          <a
            href="mailto:hello@bahavisa.com?subject=Baha%20Buddy%20Travel%20Document%20Support"
            className="inline-flex items-center justify-center rounded-full bg-gold-400 px-7 py-3 text-night font-extrabold hover:bg-gold-300 transition-colors"
          >
            Ask about documents
          </a>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  )
}
