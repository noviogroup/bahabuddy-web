import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'

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
    <main className="min-h-screen bg-offwhite">
      <section className="bg-gradient-brand text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:py-24">
          <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
            Baha Buddy Cruise Day Planner
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Your cruise stop is short. Your Nassau experience should not feel random.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-50">
            Choose a cruise-safe day plan with beach, food, culture, shopping, timing, and return-to-ship guidance.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/nassau-cruise-itineraries" className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 font-bold text-brand-700 shadow-card hover:bg-brand-50">
              View itineraries
            </Link>
            <Link href="/build-my-cruise-day" className="inline-flex items-center justify-center rounded-full border border-white/60 px-7 py-3 font-bold text-white hover:bg-white/10">
              Build my cruise day
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold text-night">A simple plan for a tight visitor window.</h2>
          <ol className="mt-7 space-y-4">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-4 rounded-baha-lg bg-white p-4 shadow-soft">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <span className="pt-1 text-charcoal">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-baha-xl border border-sand-200 bg-white p-6 shadow-card">
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Pricing</p>
          <div className="mt-5 space-y-4">
            {tiers.map((tier) => (
              <div key={tier.name} className="rounded-baha-lg border border-sand-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-extrabold text-night">{tier.name}</h3>
                  <p className="font-extrabold text-brand-700">{tier.price}</p>
                </div>
                <p className="mt-2 text-sm text-charcoal">{tier.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-baha-lg bg-gold-50 p-4 text-sm font-semibold text-night">
            Every plan should include a recommended return time and latest safe final-stop departure time.
          </div>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  )
}
