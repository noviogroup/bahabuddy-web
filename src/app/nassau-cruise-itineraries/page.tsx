import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import GuidedDayCard from '@/components/guided-day/GuidedDayCard'
import { createClient } from '@/lib/supabase/server'
import type { GuidedDayPlan } from '@/lib/guided-day/types'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Nassau Cruise Itineraries',
  description: 'Explore self-guided Nassau day plans with stops, suggested timing, and return-to-ship guidance from Baha Buddy.',
}

export default async function NassauCruiseItinerariesPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('published_cruise_itineraries')
    .select('*')
    .order('base_price', { ascending: true })

  const plans = (data ?? []) as GuidedDayPlan[]

  return (
    <main className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Self-guided Nassau day plans"
        title="Choose a smarter way to spend one day in Nassau."
        subtitle="Pick a ready-made plan built for cruise passengers with practical stops, clear timing, and a return-to-ship buffer."
        crumbs={[
          { href: '/', label: 'Home' },
          { label: 'Guided tours' },
        ]}
        actions={(
          <>
            <Link href="/nassau-cruise-day-planner" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700">
              View planner
            </Link>
            <Link href="/build-my-cruise-day" className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50">
              Build custom day
            </Link>
          </>
        )}
      />

      <section className="mx-auto max-w-6xl px-4 py-10">
        {error && (
          <div role="alert" className="rounded-baha-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <p>Tours could not be loaded.</p>
            <form action="/nassau-cruise-itineraries" method="get">
              <button type="submit" className="mt-2 inline-flex min-h-11 items-center rounded-lg underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">Try again</button>
            </form>
          </div>
        )}

        {!error && plans.length === 0 && (
          <div className="rounded-baha-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-night">No tours published yet</h2>
            <p className="mt-3 text-charcoal">
              No self-guided tours are published for this view yet.
            </p>
          </div>
        )}

        {!error && plans.length > 0 && (
          <div className="mb-6 rounded-baha-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 text-sm text-charcoal md:grid-cols-3">
              <div className="flex items-center gap-3">
                Return-to-ship planning
              </div>
              <div className="flex items-center gap-3">
                Clear timing and stop order
              </div>
              <div className="flex items-center gap-3">
                Personalization available
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {!error && plans.map((plan) => (
            <GuidedDayCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  )
}
