import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import TravelDocumentLeadForm from '@/components/revenue/TravelDocumentLeadForm'
import { BahaImages } from '@/lib/baha-images'

export const metadata: Metadata = {
  title: 'Bahamas Concierge Trip Planning',
  description:
    'Turn a rough Bahamas trip idea into a practical, human-reviewed Concierge Trip Plan with island, stay, dining, activity, transfer, budget, and document guidance.',
}

const tiers = [
  {
    id: 'quick_review',
    name: 'Quick Review',
    price: '$49',
    description: 'For travelers with a draft itinerary who want a fast local practicality pass.',
    features: [
      'Existing-plan review',
      'Island and timing sanity check',
      'Dining and activity refinements',
      'Dashboard order tracking',
    ],
    cta: 'Start quick review',
  },
  {
    id: 'concierge_trip_plan',
    name: 'Concierge Trip Plan',
    price: '$149',
    description: 'The recommended service for first-time Bahamas travelers planning 3-5 days.',
    features: [
      'Custom 3-5 day route',
      'Island fit recommendation',
      'Stay, food, beach, tour, and transfer guidance',
      'Budget and seasonal notes',
      'Travel-document checklist where relevant',
    ],
    cta: 'Choose concierge plan',
    featured: true,
  },
  {
    id: 'full_planning_support',
    name: 'Full Planning Support',
    price: '$299',
    description: 'For travelers who need the itinerary plus guided booking and support handoffs.',
    features: [
      'Everything in Concierge Trip Plan',
      'Booking assistance handoff',
      'Transfer and tour coordination support',
      'Baha Visa or document support referral',
      'Priority follow-up',
    ],
    cta: 'Get full support',
  },
]

const painPoints = [
  'The Bahamas has island-to-island logistics that can make a pretty itinerary impossible.',
  'AI can suggest the right vibe but still miss ferry timing, cruise buffers, beach access, or seasonal tradeoffs.',
  'Hotels, restaurants, transfers, and tours need to line up before money is spent.',
]

const deliverables = [
  ['Island fit', 'Where to stay, what to skip, and why the route makes sense for your group.'],
  ['Day-by-day plan', 'A practical rhythm for arrival, beaches, food, tours, downtime, and transfer windows.'],
  ['Local checks', 'Seasonality, weather sensitivity, cruise timing, accessibility, and family fit notes.'],
  ['Booking handoffs', 'Clear next steps for stays, flights, transfers, activities, restaurants, and documents.'],
]

const serviceFlow = [
  ['Choose service', 'Select the review level that matches how much help you need.'],
  ['Create account', 'Checkout is linked to your Baha Buddy account so the plan has a home.'],
  ['Pay securely', 'Stripe handles payment and the order appears in your dashboard.'],
  ['Send details', 'Share dates, group size, budget, islands, travel style, and must-dos.'],
  ['Local review', 'The team turns the rough plan into a practical Bahamas itinerary.'],
  ['Receive plan', 'Review the finished plan in your dashboard, with optional handoffs.'],
]

const scenarios = [
  {
    label: 'First trip',
    title: 'Nassau, Exuma, or somewhere quieter?',
    copy: 'We help pick the right island mix before you commit to hotels or flights.',
  },
  {
    label: 'Family or group',
    title: 'Enough structure without overpacking the day.',
    copy: 'The plan accounts for group pace, kids, budget, food, and realistic travel time.',
  },
  {
    label: 'Cruise day',
    title: 'Do the most without risking the ship.',
    copy: 'Cruise buffers, port-safe routing, and weather-sensitive alternatives stay visible.',
  },
]

const planPreview = [
  ['Trip shape', '4 days, Nassau base with one Exuma day only if flight/tour timing works.'],
  ['Stay zone', 'Beach access first, then dining and transfer convenience.'],
  ['Food plan', 'One local dinner anchor, one casual conch stop, one flexible backup.'],
  ['Risk notes', 'Weather backup, early airport return, and document checklist.'],
]

function checkoutHref(offerId: string, source = 'pricing_cta') {
  return `/concierge-trip-plan/checkout?offer=${encodeURIComponent(offerId)}&source=${encodeURIComponent(source)}`
}

function createTripFirstHref(source = 'concierge_page') {
  return `/dashboard/trips/new?${new URLSearchParams({
    returnTo: '/concierge-trip-plan',
    source,
    seed: 'Create a Bahamas trip first so Concierge can review the route, stays, food, activities, transfers, and document needs.',
  }).toString()}`
}

export default function ConciergeTripPlanPage({
  searchParams,
}: {
  searchParams?: { submitted?: string; checkout?: string }
}) {
  const submitted = searchParams?.submitted
  const cancelled = searchParams?.checkout === 'cancelled'

  return (
    <main className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Human-reviewed Bahamas planning"
        title="Turn a rough Bahamas idea into a trip you can actually book."
        subtitle="Buddy can draft the plan. Baha Buddy Concierge turns it into a practical itinerary with island fit, stay zones, food, activities, transfer timing, budget notes, and travel-document handoffs."
        crumbs={[
          { href: '/', label: 'Home' },
          { label: 'Concierge' },
        ]}
        actions={(
          <>
            <Link
              href={checkoutHref('concierge_trip_plan', 'header_cta')}
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              Start Concierge Trip Plan
            </Link>
            <Link
              href="#service-flow"
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night hover:border-gray-400 hover:bg-gray-50"
            >
              See service flow
            </Link>
          </>
        )}
      />

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          {(cancelled || submitted === 'documents') && (
            <div className="mb-6 rounded-baha-lg border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-charcoal">
              {cancelled
                ? 'Checkout was cancelled. You can choose an offer below and try again whenever ready.'
                : 'Travel-document request received. The Baha Visa team can now follow up.'}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['Bahamas only', 'No generalist destination sprawl.'],
              ['Local practicality', 'Routes, timing, budgets, and backups checked.'],
              ['Dashboard delivery', 'Orders, receipts, details, and final plan stay linked.'],
            ].map(([label, copy]) => (
              <div key={label} className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="inline-flex items-center gap-2 text-sm font-bold text-night">
                  <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                  {label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-charcoal">{copy}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm font-semibold text-gray-500">
            Account-based checkout keeps payment, trip details, receipt, and delivered plan in one dashboard.
          </p>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:py-20">
          <div>
            <p className="text-sm font-bold uppercase text-brand-700">Why local review matters</p>
            <h2 className="mt-3 text-3xl font-bold text-night">
              People do not pay for another list. They pay for confidence.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {painPoints.map((point) => (
              <div key={point} className="rounded-baha-lg border border-gray-200 bg-white p-5 text-sm leading-relaxed text-charcoal shadow-sm">
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div>
          <p className="text-sm font-bold uppercase text-brand-700">Before and after</p>
          <h2 className="mt-3 text-3xl font-bold text-night">
            From draft itinerary to decision-ready plan.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-charcoal">
            Concierge is the layer that turns inspiration into something a traveler can act on
            before booking hotels, flights, tours, and transfers.
          </p>
          <div className="mt-7 space-y-5">
            {deliverables.map(([title, copy]) => (
              <div key={title} className="pl-4">
                <h3 className="flex items-center gap-2 font-bold text-night">
                  <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-charcoal">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-baha-xl border border-gray-200 bg-white shadow-sm">
          <div className="relative h-56">
            <Image
              src={BahaImages.snorkeling}
              alt="Snorkeling and clear water in Nassau Paradise Island"
              fill
              sizes="(min-width: 1024px) 520px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-hero-bottom" />
            <div className="absolute bottom-0 p-5 text-white">
              <p className="text-sm font-bold uppercase text-gold-200">Sample output</p>
              <h3 className="mt-1 text-2xl font-bold">Concierge plan snapshot</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {planPreview.map(([label, copy]) => (
              <div key={label} className="grid gap-2 px-5 py-4 sm:grid-cols-[130px_1fr]">
                <p className="text-sm font-bold text-brand-700">{label}</p>
                <p className="text-sm leading-relaxed text-charcoal">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="service-flow" className="border-y border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:py-20">
          <p className="text-sm font-bold uppercase text-brand-700">Full service flow</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold text-night">
            A complete path from sales page to delivered itinerary.
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-charcoal">
            You can start from a simple idea, pay securely, send the details, and return to one
            place for order status, receipts, and the finished plan.
          </p>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {serviceFlow.map(([title, copy], index) => (
              <li key={title} className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
                <span className="text-xs font-bold uppercase text-brand-700">
                  Step {index + 1}
                </span>
                <h3 className="mt-3 text-lg font-bold text-night">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal">{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <article key={scenario.label} className="rounded-baha-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase text-coral-600">{scenario.label}</p>
              <h3 className="mt-3 text-2xl font-bold leading-tight text-night">{scenario.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-charcoal">{scenario.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:py-20">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-sm font-bold uppercase text-brand-700">Choose the level</p>
            <h2 className="mt-3 text-3xl font-bold text-night">
              Start with the amount of human support the trip needs.
            </h2>
            <p className="mt-4 leading-relaxed text-charcoal">
              Selecting a service starts an account-based checkout. If you are not signed in,
              you will create or enter your account first so delivery is not disconnected from the order.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {tiers.map((tier) => (
              <article
                key={tier.name}
                className={`flex h-full flex-col rounded-baha-xl border bg-white p-6 shadow-sm ${
                  tier.featured ? 'border-gray-900 ring-2 ring-gray-100' : 'border-gray-200'
                }`}
              >
                {tier.featured && (
                  <p className="mb-4 inline-flex w-fit rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-night">
                    Recommended launch offer
                  </p>
                )}
                <h3 className="text-xl font-bold text-night">{tier.name}</h3>
                <p className="mt-2 text-4xl font-bold text-brand-700">{tier.price}</p>
                <p className="mt-3 text-sm leading-relaxed text-charcoal">{tier.description}</p>
                <ul className="mt-5 flex-1 space-y-3 text-sm text-charcoal">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-palm-600" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={checkoutHref(tier.id)}
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 font-bold transition-colors ${
                    tier.featured
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'border border-gray-300 bg-white text-night hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {tier.cta}
                </Link>
                <p className="mt-3 text-center text-xs text-gray-500">Secure checkout powered by Stripe.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-night text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div>
            <p className="font-bold text-gold-300">Travel document handoff</p>
            <h2 className="mt-3 text-3xl font-bold">Need visa or travel-document help?</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-white/80">
              Concierge customers can be routed into Baha Visa and Baha Global Group for
              Bahamas visa support, document checklists, work-permit inquiries, residence
              support, group travel documentation, and corporate travel support.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {['Document checklist', 'Group travel support', 'Corporate travel', 'Residence or permit referral'].map((item) => (
                <div key={item} className="border-t border-white/20 pt-3 text-sm font-semibold text-white/85">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <TravelDocumentLeadForm />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase text-brand-700">Ready to plan</p>
            <h2 className="mt-3 text-3xl font-bold text-night">
              Start with the Concierge Trip Plan.
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-charcoal">
              The recommended launch offer gives most travelers the right balance: a practical
              3-5 day plan, local review, budget context, and clear next steps.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href={checkoutHref('concierge_trip_plan', 'bottom_cta')}
              className="inline-flex items-center justify-center rounded-full bg-brand-600 px-7 py-3 font-bold text-white transition-colors hover:bg-brand-700"
            >
              Choose Concierge Trip Plan
            </Link>
            <Link
              href={createTripFirstHref('concierge_bottom_cta')}
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-7 py-3 font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Create trip first
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  )
}
