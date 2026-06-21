import type { Metadata } from 'next'
import UtilityContentLayout from '@/components/marketplace/UtilityContentLayout'

export const metadata: Metadata = {
  title: 'About Baha Buddy',
  description:
    'Baha Buddy is an AI-powered Bahamas travel companion by Novio Group. Plan trips, compare stays and flights, and travel with local context.',
}

export default function AboutPage() {
  return (
    <UtilityContentLayout
      activePath="/about"
      title="About Baha Buddy"
      subtitle="Baha Buddy is a Bahamas-first travel companion that helps travelers explore, plan, save, and book without losing context."
    >
      <section>
        <h2>What Baha Buddy does</h2>
        <p>
          Baha Buddy helps travelers plan trips across the Bahamas with a mix of
          AI guidance, curated local data, live stay and flight search, trip
          management, and mobile travel support.
        </p>
        <p>
          The product is built for people who want more than a generic booking
          form. Travelers can browse islands, compare stays, check flights, save
          ideas, and ask Buddy for help when a decision needs context.
        </p>
      </section>

      <section>
        <h2>Why the Bahamas</h2>
        <p>
          The Bahamas is not one destination. It is hundreds of islands and cays,
          each with different routes, seasons, beaches, food, stays, and travel
          tradeoffs. Baha Buddy focuses on that depth instead of trying to cover
          every destination in the world.
        </p>
      </section>

      <section>
        <h2>Built by Novio Group</h2>
        <p>
          Baha Buddy is developed by Novio Group, a technology company building
          practical AI products for real consumer and business workflows.
        </p>
        <p>
          For support, contact{' '}
          <a href="mailto:support@bahabuddy.com">support@bahabuddy.com</a>.
          For business inquiries, contact{' '}
          <a href="mailto:hello@noviogroup.com">hello@noviogroup.com</a>.
        </p>
      </section>
    </UtilityContentLayout>
  )
}
