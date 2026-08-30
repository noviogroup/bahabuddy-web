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
  description: 'Choose a cruise-safe Nassau day plan with timing, stops, and return-to-ship guidance from Baha Buddy.',
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
        eyebrow="Nassau cruise day plans"
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
          <div className="rounded-baha-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            Itineraries could not be loaded. Please try again soon.
          </div>
        )}

        {!error && plans.length === 0 && (
          <div className="rounded-baha-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-night">Itineraries are being prepared.</h2>
            <p className="mt-3 text-charcoal">
              Admin should publish at least one guided day plan before this page goes live.
            </p>
          </div>
        )}

        {plans.length > 0 && (
          <div className="mb-6 rounded-baha-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 text-sm text-charcoal md:grid-cols-3">
              <div className="flex items-center gap-3">
                Cruise-safe return buffer
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
          {plans.map((plan) => (
            <GuidedDayCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  )
}
