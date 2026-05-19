import type { Metadata } from 'next'
import Link from 'next/link'
import { BahaLogo } from '@/components/ui'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Baha Buddy privacy policy. Learn how we collect, use, and protect your data.',
  openGraph: {
    title: 'Privacy Policy | Baha Buddy',
    description:
      'Learn how Baha Buddy collects, uses, and protects your data.',
  },
}

export default function PrivacyPage() {
  const effectiveDate = 'May 18, 2026'

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <BahaLogo href="/" size="md" />
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-14">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Effective date: {effectiveDate}
        </p>

        <div className="prose prose-gray max-w-none space-y-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-3 [&_p]:text-gray-600 [&_p]:leading-relaxed [&_ul]:text-gray-600 [&_ul]:leading-relaxed">
          <section>
            <h2>1. Introduction</h2>
            <p>
              Baha Buddy (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is
              operated by Novio Group. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you use
              the Baha Buddy mobile application and website (collectively, the
              &quot;Service&quot;). By using the Service, you agree to the
              practices described in this policy.
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <p>We may collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Account information:</strong> email address and display
                name when you create an account.
              </li>
              <li>
                <strong>Travel preferences:</strong> destination interests,
                travel dates, budget ranges, and trip style selections you
                provide.
              </li>
              <li>
                <strong>Chat history:</strong> conversations with Baha Buddy AI
                to provide personalized recommendations.
              </li>
              <li>
                <strong>Trip data:</strong> saved itineraries, bookings, and
                uploaded receipts.
              </li>
              <li>
                <strong>Usage data:</strong> pages visited, features used, and
                interaction patterns to improve the Service.
              </li>
              <li>
                <strong>Device information:</strong> device type, operating
                system, and app version for technical support and optimization.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide, maintain, and improve the Service.</li>
              <li>
                Generate personalized travel recommendations and AI-powered
                responses.
              </li>
              <li>Process and display your saved trips and bookings.</li>
              <li>
                Send service-related notifications (e.g., booking confirmations,
                account updates).
              </li>
              <li>
                Analyze usage trends to enhance features and user experience.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Third-Party Services</h2>
            <p>
              Baha Buddy integrates with the following third-party services to
              deliver its features:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Supabase:</strong> authentication, database, and backend
                infrastructure.
              </li>
              <li>
                <strong>Anthropic (Claude API):</strong> AI-powered chat and
                travel recommendations.
              </li>
              <li>
                <strong>Google Places API:</strong> location data, place details,
                and photos.
              </li>
              <li>
                <strong>Duffel:</strong> flight search and booking.
              </li>
              <li>
                <strong>Stripe:</strong> payment processing for premium features
                and bookings.
              </li>
            </ul>
            <p>
              Each of these services operates under its own privacy policy. We
              encourage you to review them.
            </p>
          </section>

          <section>
            <h2>5. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as
              needed to provide the Service. Chat history and trip data are
              stored to maintain continuity across sessions. You may request
              deletion of your data at any time (see Section 7).
            </p>
          </section>

          <section>
            <h2>6. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your
              information, including encryption in transit and at rest,
              role-based access controls, and regular security reviews. However,
              no method of transmission over the internet is 100% secure, and we
              cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access the personal data we hold about you.</li>
              <li>
                Request correction of inaccurate information.
              </li>
              <li>
                Delete your account and all associated data. When you delete your
                account, we permanently remove your profile, chat history, trip
                data, and preferences from our systems.
              </li>
              <li>
                Export your trip data in a portable format.
              </li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{' '}
              <a
                href="mailto:support@bahabuddy.com"
                className="text-brand-600 hover:text-brand-700 underline underline-offset-2"
              >
                support@bahabuddy.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2>8. Children&#39;s Privacy</h2>
            <p>
              The Service is not intended for children under 13. We do not
              knowingly collect information from children under 13. If you
              believe we have collected such information, please contact us so we
              can delete it.
            </p>
          </section>

          <section>
            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify
              you of material changes by posting the updated policy on this page
              and updating the effective date. Your continued use of the Service
              after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2>10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data
              practices, contact us at:
            </p>
            <p>
              <strong>Novio Group</strong>
              <br />
              Email:{' '}
              <a
                href="mailto:support@bahabuddy.com"
                className="text-brand-600 hover:text-brand-700 underline underline-offset-2"
              >
                support@bahabuddy.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
