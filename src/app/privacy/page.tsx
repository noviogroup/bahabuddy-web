import type { Metadata } from 'next'
import UtilityContentLayout from '@/components/marketplace/UtilityContentLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Baha Buddy privacy policy. Learn how we collect, use, and protect traveler data.',
}

export default function PrivacyPage() {
  return (
    <UtilityContentLayout
      activePath="/privacy"
      title="Privacy Policy"
      subtitle="How Baha Buddy handles account, trip, chat, booking, and device data."
      effectiveDate="May 18, 2026"
    >
      <section>
        <h2>Information we collect</h2>
        <p>
          We collect account information, travel preferences, chat messages, trip
          details, saved items, booking records, support requests, and basic
          device or usage data needed to operate and improve Baha Buddy.
        </p>
      </section>

      <section>
        <h2>How we use information</h2>
        <p>
          We use traveler data to provide AI trip planning, show relevant stays,
          flights, restaurants, activities, and tours, manage saved trips and
          bookings, process support requests, and improve product quality.
        </p>
      </section>

      <section>
        <h2>Bookings and payments</h2>
        <p>
          Payment processing is handled by Stripe. Hotel and flight availability
          and booking services may be provided through LiteAPI and other travel
          providers. We share only the information required to search, prebook,
          book, support, or reconcile a transaction.
        </p>
      </section>

      <section>
        <h2>AI and third-party services</h2>
        <p>
          Baha Buddy uses third-party services including Supabase, Anthropic,
          OpenAI, Google Maps and Places, LiteAPI, Stripe, analytics providers,
          and support tooling. Each provider handles data under its own terms and
          policies.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You may request access, correction, export, or deletion of your data by
          contacting <a href="mailto:support@bahabuddy.com">support@bahabuddy.com</a>.
          Some booking, payment, tax, fraud-prevention, and support records may
          be retained where legally or operationally required.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          For privacy questions, contact Novio Group at{' '}
          <a href="mailto:support@bahabuddy.com">support@bahabuddy.com</a>.
        </p>
      </section>
    </UtilityContentLayout>
  )
}
