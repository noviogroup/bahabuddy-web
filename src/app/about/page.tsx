import type { Metadata } from 'next'
import Link from 'next/link'
import { BahaLogo } from '@/components/ui'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'About Baha Buddy',
  description:
    'Baha Buddy is an AI-powered Bahamas travel companion by Novio Group. Plan trips, find deals, and explore 700+ islands from one app.',
  openGraph: {
    title: 'About Baha Buddy',
    description:
      'Baha Buddy is an AI-powered Bahamas travel companion by Novio Group.',
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <BahaLogo href="/" size="md" />
          <nav className="flex items-center gap-4">
            <Link
              href="/destinations"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Destinations
            </Link>
            <Link
              href="/deals"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Deals
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

      <div className="bg-gradient-to-br from-brand-600 to-brand-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <p className="text-brand-100 text-sm font-semibold tracking-widest uppercase mb-3">
            About Us
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Meet Baha Buddy
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            The AI-powered travel companion built for the Bahamas.
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-14">
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            What is Baha Buddy?
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Baha Buddy is an AI-powered travel companion designed specifically
            for the Bahamas. Whether you are planning your first trip to Nassau
            or island-hopping through the Exumas, Baha Buddy helps you discover
            destinations, compare flights and hotels, and build a personalized
            itinerary — all from a single app.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Available on iOS and Android, Baha Buddy puts the entire
            archipelago at your fingertips with real-time recommendations
            powered by AI.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            The Problem We Solve
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            The Bahamas spans more than 700 islands and cays, yet most travel
            resources only scratch the surface. Trip planning is scattered across
            dozens of websites, review platforms, and booking tools with little
            coordination between them. Travelers waste hours piecing together
            itineraries and still miss the best experiences.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Baha Buddy solves this by combining destination knowledge, booking
            tools, and AI-driven planning into one streamlined experience.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Key Features
          </h2>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
                1
              </span>
              <div>
                <h3 className="font-semibold text-gray-900">Buddy AI Chat</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Ask anything about the Bahamas and get instant, informed
                  answers. Buddy helps you choose islands, plan day-by-day
                  itineraries, and find hidden gems.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
                2
              </span>
              <div>
                <h3 className="font-semibold text-gray-900">
                  700+ Islands Covered
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Browse detailed profiles for islands, beaches, restaurants,
                  and attractions across the entire Bahamian archipelago.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
                3
              </span>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Flight and Hotel Search
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Search and compare flights and accommodations with integrated
                  booking tools. No tab-switching required.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
                4
              </span>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Trip Management
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Save trips, track bookings, upload receipts, and share
                  itineraries with travel companions — all in one place.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Built by Novio Group
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Baha Buddy is developed by{' '}
            <a
              href="https://noviogroup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:text-brand-700 underline underline-offset-2"
            >
              Novio Group
            </a>
            , a technology company focused on building practical, AI-powered
            products that simplify everyday decisions. We believe travel planning
            should be effortless, and the Bahamas deserves a dedicated platform
            that does it justice.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Have questions or feedback? Reach us at{' '}
            <a
              href="mailto:support@bahabuddy.com"
              className="text-brand-600 hover:text-brand-700 underline underline-offset-2"
            >
              support@bahabuddy.com
            </a>
            .
          </p>
        </section>

        <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Ready to explore?</h2>
          <p className="text-brand-100 mb-6">
            Download Baha Buddy and start planning your Bahamas trip today.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold rounded-xl px-6 py-3 hover:bg-brand-50 transition-colors text-sm"
          >
            Get Started Free
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
