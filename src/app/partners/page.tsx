import type { Metadata } from 'next'
import UtilityContentLayout from '@/components/marketplace/UtilityContentLayout'
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

function CardGrid({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item} className="rounded-baha-lg border border-gray-200 bg-white p-4 text-sm font-semibold leading-6 text-charcoal shadow-sm">
          {item}
        </div>
      ))}
    </div>
  )
}

export default function PartnersPage({
  searchParams,
}: {
  searchParams?: { submitted?: string }
}) {
  const submitted = searchParams?.submitted === 'partner'

  return (
    <UtilityContentLayout
      activePath="/partners"
      title="Partner with Baha Buddy"
      subtitle="Hotels, tours, restaurants, transportation providers, and island stakeholders can apply for Baha Buddy placement, referrals, and future marketplace opportunities."
    >
      {submitted && (
        <section className="rounded-baha-lg border border-palm-100 bg-palm-50 p-4">
          <h2>Application received</h2>
          <p>
            Partner application received. The Baha Buddy team can now review
            the submission and follow up.
          </p>
        </section>
      )}

      <section>
        <h2>Founding partner opportunity</h2>
        <p>
          Baha Buddy connects visitors with hotels, tours, restaurants,
          transportation, activities, local guides, island experiences, and
          trusted travel services before and during their trip.
        </p>
        <p>
          Apply below if your business should be considered for marketplace
          listings, Explore placement, concierge referrals, campaigns, or
          future booking integrations. Travelers can review the current
          <a href="/concierge-trip-plan"> concierge trip planning offer</a>.
        </p>
        <p>
          <a href="#partner-application">Apply to become a partner</a>
        </p>
      </section>

      <section>
        <h2>Who should apply</h2>
        <CardGrid items={partnerCategories} />
      </section>

      <section>
        <h2>What partners get</h2>
        <p>
          The first version is managed onboarding, not a full self-service
          partner portal. The goal is to qualify supply, keep listing quality
          high, and learn which partner offers drive real traveler value.
        </p>
        <CardGrid items={partnerBenefits} />
      </section>

      <section>
        <h2>Where your business can appear</h2>
        <CardGrid items={placementExamples} />
      </section>

      <section>
        <h2>Early partner tiers</h2>
        <p>
          Tiers are intake categories for the beta marketplace. Final pricing,
          reporting, and placement rules should be managed through admin once
          demand and booking volume justify a full partner portal.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {tiers.map((tier) => (
            <article key={tier.name} className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3>{tier.name}</h3>
              <p className="text-2xl font-extrabold text-brand-700">{tier.price}</p>
              <p>{tier.description}</p>
              <div className="mt-4 space-y-2">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex gap-2 text-sm leading-6 text-charcoal">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden="true" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="partner-application">
        <h2>Partner intake</h2>
        <p>
          The first partner form collects what is needed to create
          admin-managed partner records, build Explore listings, track lead
          source, and prepare future featured placement reporting.
        </p>
        <CardGrid items={intakeFields} />
        <div className="mt-8">
          <PartnerApplicationForm />
        </div>
      </section>
    </UtilityContentLayout>
  )
}
