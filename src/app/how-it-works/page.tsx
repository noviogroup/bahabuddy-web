import type { Metadata } from 'next'
import UtilityContentLayout from '@/components/marketplace/UtilityContentLayout'
import SanityManagedContentPage from '@/components/marketplace/SanityManagedContentPage'
import { fetchContentPageByRoute } from '@/lib/sanity/queries'

export const metadata: Metadata = {
  title: 'How Baha Buddy Works',
  description: 'How travelers use Baha Buddy to explore, plan, book, and travel in the Bahamas.',
}

export default async function HowItWorksPage() {
  const managedPage = await fetchContentPageByRoute('/how-it-works')
  if (managedPage) return <SanityManagedContentPage page={managedPage} />

  return (
    <UtilityContentLayout
      activePath="/how-it-works"
      title="How Baha Buddy works"
      subtitle="Browse before signing in, then save, book, and manage your trip once you have an account."
    >
      <section>
        <h2>Browse the Bahamas</h2>
        <p>
          Public visitors can explore islands, stays, flights, guides, deals,
          places, restaurants, and tours before creating an account.
        </p>
      </section>
      <section>
        <h2>Plan with Buddy</h2>
        <p>
          Buddy helps explain tradeoffs, compare islands, build day plans, and
          connect recommendations back to the traveler&apos;s full trip.
        </p>
      </section>
      <section>
        <h2>Book directly</h2>
        <p>
          Stay and flight booking flows keep search, traveler details, payment,
          and confirmation in one trip flow.
        </p>
      </section>
      <section>
        <h2>Travel with context</h2>
        <p>
          Saved trips, bookings, guided days, maps, and support remain available
          through the traveler dashboard and mobile app.
        </p>
      </section>
    </UtilityContentLayout>
  )
}
