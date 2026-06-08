import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import GuidedDayCard from '@/components/guided-day/GuidedDayCard'
import { createClient } from '@/lib/supabase/server'
import type { GuidedDayPlan } from '@/lib/guided-day/types'
import DefaultHeaderHero from '@/components/DefaultHeaderHero'
import { resolveDefaultHeaderImage } from '@/lib/default-headers'

export const metadata: Metadata = {
  title: 'Nassau Cruise Itineraries',
  description: 'Choose a cruise-safe Nassau day plan with timing, stops, and return-to-ship guidance from Baha Buddy.',
}

export default async function NassauCruiseItinerariesPage() {
  const supabase = await createClient()
  const [{ data, error }, heroHeader] = await Promise.all([
    supabase
      .from('published_cruise_itineraries')
      .select('*')
      .order('base_price', { ascending: true }),
    resolveDefaultHeaderImage({ category: 'Cruise Day', island: 'Nassau', preferredVariant: 'desktop' }),
  ])

  const plans = (data ?? []) as GuidedDayPlan[]

  return (
    <main className="min-h-screen bg-offwhite">
      <DefaultHeaderHero
        eyebrow="Nassau cruise day plans"
        title="Choose a smarter way to spend one day in Nassau."
        subtitle="Pick a ready-made plan built for cruise passengers with practical stops, clear timing, and a return-to-ship buffer."
        header={heroHeader}
        align="left"
      />

      <section className="mx-auto max-w-6xl px-4 py-14">
        {error && (
          <div className="rounded-baha-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            Itineraries could not be loaded. Confirm Supabase environment variables and RLS policies.
          </div>
        )}

        {!error && plans.length === 0 && (
          <div className="rounded-baha-xl border border-sand-200 bg-white p-8 text-center shadow-card">
            <h2 className="text-2xl font-extrabold text-night">Itineraries are being prepared.</h2>
            <p className="mt-3 text-charcoal">
              Admin should publish at least one guided day plan before this page goes live.
            </p>
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
