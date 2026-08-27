import type { Metadata } from 'next'
import UtilityContentLayout from '@/components/marketplace/UtilityContentLayout'
import SanityManagedContentPage from '@/components/marketplace/SanityManagedContentPage'
import { fetchContentPageByRoute } from '@/lib/sanity/queries'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Baha Buddy terms of service for trip planning, bookings, payments, and account use.',
}

export default async function TermsPage() {
  const managedPage = await fetchContentPageByRoute('/terms')
  if (managedPage) return <SanityManagedContentPage page={managedPage} />

  return (
    <UtilityContentLayout
      activePath="/terms"
      title="Terms of Service"
      subtitle="The terms governing your use of Baha Buddy across web and mobile."
      effectiveDate="May 18, 2026"
    >
      <section>
        <h2>Service overview</h2>
        <p>
          Baha Buddy is an AI-powered Bahamas travel companion. The service
          supports destination discovery, AI-assisted trip planning, stay and
          flight search, saved itineraries, concierge services, and related
          booking flows.
        </p>
      </section>

      <section>
        <h2>Accounts</h2>
        <p>
          Browsing public content does not require an account. Saving to a trip,
          checkout, booking, profile access, and trip mutation require an
          authenticated account. You are responsible for activity under your
          account.
        </p>
      </section>

      <section>
        <h2>AI guidance</h2>
        <p>
          Buddy provides planning help and recommendations. AI output may be
          incomplete or outdated, so travelers should verify critical details
          such as prices, operating hours, weather, travel documents, safety
          information, and provider policies before acting.
        </p>
      </section>

      <section>
        <h2>Bookings and provider terms</h2>
        <p>
          When you book a stay, flight, tour, or other travel product, the
          provider may have separate cancellation, refund, baggage, check-in,
          identity, and service policies. Baha Buddy may help facilitate the
          transaction, but provider terms apply to the travel product.
        </p>
      </section>

      <section>
        <h2>Payments</h2>
        <p>
          Payments are processed through Stripe or another approved payment
          processor. A booking should not be treated as confirmed until payment
          and booking checks are complete.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          For questions about these terms, contact{' '}
          <a href="mailto:support@bahabuddy.com">support@bahabuddy.com</a>.
        </p>
      </section>
    </UtilityContentLayout>
  )
}
