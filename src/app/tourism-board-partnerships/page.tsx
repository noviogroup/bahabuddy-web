import type { Metadata } from 'next'
import UtilityContentLayout from '@/components/marketplace/UtilityContentLayout'
import PartnerApplicationForm from '@/components/revenue/PartnerApplicationForm'

export const metadata: Metadata = {
  title: 'Tourism Board Partnerships | Baha Buddy',
  description:
    'Baha Buddy helps Bahamas tourism boards, island stakeholders, and destination partners turn traveler intent into curated trip planning, campaigns, and measurable visitor interest.',
}

const partnerTypes = [
  'National and island tourism boards',
  'Destination marketing organizations',
  'Hotel and tourism associations',
  'Port, airport, and transportation stakeholders',
  'Cultural, heritage, and community tourism programs',
  'Public-private tourism initiatives',
]

const campaignModels = [
  {
    title: 'Destination guide sponsorship',
    description:
      'A managed island or theme guide that helps travelers understand fit, timing, routes, stays, food, and experiences before they book.',
  },
  {
    title: 'Itinerary placement',
    description:
      'Curated partner recommendations inside Buddy planning flows, with clear relevance to the traveler request and trip context.',
  },
  {
    title: 'Seasonal campaign support',
    description:
      'Promotion for travel windows, events, cultural moments, family breaks, romance trips, cruise days, or shoulder-season demand.',
  },
  {
    title: 'Visitor-intent reporting',
    description:
      'Practical readouts on searched islands, trip styles, dates, group types, budget signals, and content that influenced planning.',
  },
]

const pilotDeliverables = [
  'A clear campaign objective and traveler audience',
  'Approved island, attraction, event, and partner source material',
  'Curated recommendations that match Baha Buddy quality rules',
  'Tracked public page, Explore, and Buddy planning entry points',
  'Monthly performance summary once traffic volume is meaningful',
]

function Checklist({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item} className="flex gap-3 rounded-baha-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-charcoal">
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
          <span className="font-semibold">{item}</span>
        </div>
      ))}
    </div>
  )
}

export default function TourismBoardPartnershipsPage({
  searchParams,
}: {
  searchParams?: { submitted?: string }
}) {
  const submitted = searchParams?.submitted === 'tourism-board'

  return (
    <UtilityContentLayout
      activePath="/tourism-board-partnerships"
      title="Tourism board partnerships"
      subtitle="A Bahamas-only AI travel companion gives destination stakeholders a focused way to influence trip planning before visitors decide where to stay, eat, and explore."
    >
      {submitted && (
        <section className="rounded-baha-lg border border-palm-100 bg-palm-50 p-4">
          <h2>Partnership inquiry received</h2>
          <p>
            The Baha Buddy team can now review the destination partnership
            inquiry and prepare the right follow-up path.
          </p>
        </section>
      )}

      <section>
        <h2>Built for destination depth</h2>
        <p>
          Baha Buddy is not a general travel search page. It is a Bahamas-first
          planning companion that helps travelers compare islands, shape an
          itinerary, save recommendations, and move into stays, flights,
          activities, restaurants, and concierge support.
        </p>
        <p>
          Tourism partners can use that context to promote the right island,
          season, event, or experience to travelers while they are still making
          decisions.
        </p>
      </section>

      <section>
        <h2>Who this is for</h2>
        <Checklist items={partnerTypes} />
      </section>

      <section>
        <h2>Partnership models</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {campaignModels.map((model) => (
            <article key={model.title} className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3>{model.title}</h3>
              <p>{model.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>What a pilot needs</h2>
        <p>
          The first destination partnerships should stay managed and measurable.
          Baha Buddy can start with one island, travel theme, event window, or
          partner corridor before expanding into a broader annual program.
        </p>
        <Checklist items={pilotDeliverables} />
      </section>

      <section>
        <h2>How success is measured</h2>
        <p>
          Reporting should focus on useful intent signals rather than vanity
          impressions: destination interest, trip themes, clicked offers, saved
          recommendations, concierge inquiries, booking-path starts, and
          content that helped travelers move forward.
        </p>
        <p>
          As booking volume matures, the same model can support promoted
          destination content, sponsored collections, and partner packages
          without turning Buddy into a generic ad surface.
        </p>
      </section>

      <section id="destination-partnership-inquiry">
        <h2>Start a destination partnership</h2>
        <p>
          Use this intake path for tourism boards, associations, and destination
          stakeholders. Local businesses should use the general{' '}
          <a href="/partners">partner application</a>.
        </p>
        <PartnerApplicationForm
          action="/tourism-board-partnerships?submitted=tourism-board"
          title="Submit a destination partnership inquiry"
          description="Share the destination, stakeholder group, campaign goal, and current tourism priority so Baha Buddy can assess fit for a managed pilot."
        />
      </section>
    </UtilityContentLayout>
  )
}
