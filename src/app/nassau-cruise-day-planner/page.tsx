import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'

export const metadata: Metadata = {
  title: 'Nassau Cruise Day Planner',
  description: 'Plan a better Nassau cruise stop with Baha Buddy ready-made and personalized one-day itineraries.',
}

const steps = [
  'Tell us your ship time, group size, interests, and budget.',
  'Choose a ready-made Nassau day plan or personalize one.',
  'Follow a clear timeline with stops, timing, and return guidance.',
  'Use the mobile app for the full Live Guide experience.',
]

const tiers = [
  { name: 'Ready-Made Day Pass', price: '$9.99', detail: 'Choose one published itinerary.' },
  { name: 'Personalized Day Pass', price: '$19.99', detail: 'Adjust the plan to your ship time and travel style.' },
  { name: 'Concierge Day Plan', price: '$49.99+', detail: 'Get planning support and booking handoff.' },
]

export default function NassauCruiseDayPlannerPage() {
  return (
    <main className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Baha Buddy Cruise Day Planner"
        title="Your cruise stop is short. Your Nassau experience should not feel random."
        subtitle="Choose a cruise-safe day plan with beach, food, culture, shopping, timing, and return-to-ship guidance."
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/nassau-cruise-itineraries', label: 'Guided tours' },
          { label: 'Cruise day planner' },
        ]}
        actions={(
          <>
            <Link href="/nassau-cruise-itineraries" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700">
              View itineraries
            </Link>
            <Link href="/build-my-cruise-day" className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50">
              Build my cruise day
            </Link>
          </>
        )}
      />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase text-brand-700">How it works</p>
          <h2 className="mt-3 text-3xl font-bold text-night">A simple plan for a tight visitor window.</h2>
          <ol className="mt-7 space-y-4">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-4 rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-400 text-sm font-bold text-night">
                  {index + 1}
                </span>
                <span className="pt-1 text-charcoal">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-baha-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase text-brand-700">Pricing</p>
          <div className="mt-5 space-y-4">
            {tiers.map((tier) => (
              <div key={tier.name} className="rounded-baha-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-bold text-night">{tier.name}</h3>
                  <p className="font-bold text-brand-700">{tier.price}</p>
                </div>
                <p className="mt-2 text-sm text-charcoal">{tier.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3 rounded-baha-lg border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-night">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold-400" aria-hidden="true" />
            <span>Every plan should include a recommended return time and latest safe final-stop departure time.</span>
          </div>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  )
}
