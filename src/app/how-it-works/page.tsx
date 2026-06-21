import type { Metadata } from 'next'
import UtilityContentLayout from '@/components/marketplace/UtilityContentLayout'

export const metadata: Metadata = {
  title: 'How Baha Buddy Works',
  description: 'How travelers use Baha Buddy to explore, plan, book, and travel in the Bahamas.',
}

export default function HowItWorksPage() {
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
          Stay and flight booking flows use direct UI for search, rate or fare
          verification, traveler details, payment, provider booking, and
          confirmation.
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
