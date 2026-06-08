import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import GuidedDayCard from '@/components/guided-day/GuidedDayCard'
import { createClient } from '@/lib/supabase/server'
import type { GuidedDayPlan } from '@/lib/guided-day/types'

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
    <main className="min-h-screen bg-offwhite">
      <section className="bg-gradient-brand text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
            Nassau cruise day plans
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Choose a smarter way to spend one day in Nassau.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-50">
            Pick a ready-made plan built for cruise passengers with practical stops, clear timing, and a return-to-ship buffer.
          </p>
        </div>
      </section>

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
