import type { Metadata } from 'next'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import Footer from '@/components/Footer'
import PartnerApplicationForm from '@/components/revenue/PartnerApplicationForm'

export const metadata: Metadata = {
  title: 'Partner with Baha Buddy',
  description:
    'Invite hotels, tour operators, restaurants, transportation providers, and island stakeholders to join the Baha Buddy travel ecosystem.',
}

const partnerCategories = [
  'Hotels and resorts',
  'Boutique stays and villas',
  'Tour operators',
  'Restaurants and bars',
  'Transportation providers',
  'Boat charters',
  'Airport transfers',
  'Airlines and island connections',
  'Local guides and experience hosts',
  'Event organizers',
  'Visa and travel-document services',
  'Destination and island stakeholders',
]

const partnerBenefits = [
  'Visibility in Explore and island guide pages',
  'Recommendation eligibility inside Buddy planning flows',
  'Deal and featured placement opportunities',
  'Concierge referral opportunities for high-intent travelers',
  'Campaign inclusion for seasonal or island-specific promotions',
  'Performance reporting as partner analytics mature',
]

const placementExamples = [
  'Featured Nassau restaurant guide',
  'Weekend in Exuma campaign',
  'Airport transfer recommendation',
  'Hotel spotlight placement',
  'Family-friendly activity collection',
  'Honeymoon itinerary partner feature',
]

const tiers = [
  {
    name: 'Free Listing',
    price: '$0',
    description: 'Basic presence in the Baha Buddy ecosystem while we build destination coverage.',
    features: ['Business profile', 'Category placement', 'Basic discoverability'],
  },
  {
    name: 'Verified Partner',
    price: '$49-$99/mo',
    description: 'Entry paid tier for local businesses that want more trust and lead visibility.',
    features: ['Verified badge', 'Enhanced profile', 'Offer/deal submission eligibility', 'More recommendation eligibility'],
  },
  {
    name: 'Featured Partner',
    price: '$199-$499/mo',
    description: 'Growth tier for operators that want stronger visibility in Explore and campaigns.',
    features: ['Featured Explore placement', 'Deal placement', 'Campaign inclusion', 'Partner performance reporting'],
  },
  {
    name: 'Premium / Strategic',
    price: 'Custom',
    description: 'For hotels, airlines, destination stakeholders, and major tourism operators.',
    features: ['Sponsored campaigns', 'Category or island placement', 'Analytics dashboard', 'Booking or API integration planning'],
  },
]

const intakeFields = [
  'Business name',
  'Business category',
  'Island or service area',
  'Contact person',
  'Email and phone',
  'Website and social links',
  'Short description',
  'Images or marketing assets',
  'Current booking method',
  'Preferred partner tier',
]

export default function PartnersPage({
  searchParams,
}: {
  searchParams?: { submitted?: string }
}) {
  const submitted = searchParams?.submitted === 'partner'

  return (
    <main className="min-h-screen bg-offwhite">
      <PublicHeader />
      <section className="bg-white border-b border-sand-200">
        <div className="max-w-6xl mx-auto px-4 py-20 lg:py-24 grid lg:grid-cols-[1fr_0.9fr] gap-12 items-center">
          <div>
            <p className="inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">
              Founding Partner Opportunity
            </p>
            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight text-night leading-tight">
              Be discovered by travelers planning The Bahamas with Buddy.
            </h1>
            <p className="mt-6 text-lg text-charcoal leading-relaxed max-w-2xl">
              Baha Buddy connects visitors with hotels, tours, restaurants, transportation,
              activities, local guides, island experiences, and trusted travel services before and
              during their trip.
            </p>
            {submitted && (
              <div className="mt-6 rounded-baha-lg bg-palm-50 border border-palm-100 p-4 text-palm-800 text-sm font-semibold">
                Partner application received. The Baha Buddy team can now review and follow up.
              </div>
            )}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href="#partner-application"
                className="inline-flex items-center justify-center rounded-full bg-brand-600 px-7 py-3 text-white font-bold shadow-card hover:bg-brand-700 transition-colors"
              >
                Apply to become a partner
              </a>
              <Link
                href="/concierge-trip-plan"
                className="inline-flex items-center justify-center rounded-full bg-sand-100 px-7 py-3 text-brand-800 font-bold border border-sand-200 hover:bg-sand-200 transition-colors"
              >
                See traveler offer
              </Link>
            </div>
          </div>

          <div className="rounded-baha-xl bg-gradient-brand text-white p-6 lg:p-8 shadow-card">
            <p className="text-brand-50 text-sm font-bold uppercase tracking-wide">Why join early</p>
            <div className="mt-5 space-y-4">
              {[
                'Get listed while Baha Buddy is building destination coverage.',
                'Become eligible for AI-assisted recommendations and Explore placements.',
                'Create deal and campaign opportunities before the full marketplace launches.',
                'Help shape the partner model with the Baha Buddy team.',
              ].map((item) => (
                <div key={item} className="rounded-baha-lg bg-white/10 border border-white/15 p-4 text-sm leading-relaxed">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14 lg:py-20 grid lg:grid-cols-2 gap-10">
        <div>
          <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">What partners get</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-night">
            Visibility, recommendations, leads, and campaign opportunities.
          </h2>
          <div className="mt-7 grid sm:grid-cols-2 gap-3">
            {partnerBenefits.map((benefit) => (
              <div key={benefit} className="rounded-baha-lg bg-white border border-sand-200 p-4 shadow-soft text-sm text-charcoal leading-relaxed">
                {benefit}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-baha-xl bg-night text-white p-6 lg:p-8 shadow-card">
          <p className="text-gold-300 text-sm font-bold uppercase tracking-wide">Placement examples</p>
          <h3 className="mt-3 text-3xl font-extrabold">Where your business can appear</h3>
          <div className="mt-6 space-y-3">
            {placementExamples.map((example) => (
              <div key={example} className="rounded-baha-lg bg-white/10 border border-white/15 p-4 text-sm text-white/85">
                {example}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-14 lg:pb-20">
        <div className="max-w-3xl mb-8">
          <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">Partner categories</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-night">
            Building the supply side of the Bahamas travel ecosystem.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partnerCategories.map((category) => (
            <div key={category} className="rounded-baha-lg bg-white border border-sand-200 p-4 shadow-soft text-charcoal font-medium">
              {category}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-sand-200">
        <div className="max-w-6xl mx-auto px-4 py-14 lg:py-20">
          <div className="max-w-3xl mb-8">
            <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">Early partner tiers</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-night">
              Start simple: managed onboarding before a full partner portal.
            </h2>
            <p className="mt-4 text-charcoal leading-relaxed">
              This page supports partner recruitment and lead capture only. Partner records should
              still be managed in the admin portal until paid demand and booking volume justify a
              full self-service partner portal.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {tiers.map((tier) => (
              <article key={tier.name} className="rounded-baha-xl bg-offwhite border border-sand-200 p-5 shadow-soft">
                <h3 className="text-lg font-extrabold text-night">{tier.name}</h3>
                <p className="mt-2 text-2xl font-extrabold text-brand-700">{tier.price}</p>
                <p className="mt-3 text-sm text-charcoal leading-relaxed">{tier.description}</p>
                <ul className="mt-5 space-y-2 text-sm text-charcoal">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-palm-600 font-bold">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="partner-application" className="max-w-6xl mx-auto px-4 py-14 lg:py-20 grid lg:grid-cols-[0.85fr_1.15fr] gap-10">
        <div>
          <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">Partner intake</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-night">
            Minimum data needed for the first 90 days.
          </h2>
          <p className="mt-4 text-charcoal leading-relaxed">
            The first partner form collects what is needed to create admin-managed partner records,
            build Explore listings, track lead source, and prepare future featured placement reporting.
          </p>
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {intakeFields.map((field) => (
              <div key={field} className="rounded-baha-lg bg-white border border-sand-200 p-4 shadow-soft text-charcoal">
                {field}
              </div>
            ))}
          </div>
        </div>
        <PartnerApplicationForm />
      </section>

      <Footer />
    </main>
  )
}
