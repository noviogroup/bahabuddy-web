import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import GuidedDayTimeline from '@/components/guided-day/GuidedDayTimeline'
import ReturnSafetyCard from '@/components/guided-day/ReturnSafetyCard'
import { createClient } from '@/lib/supabase/server'
import type { GuidedDayPlanDetail } from '@/lib/guided-day/types'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `${slug.replaceAll('-', ' ')} | Nassau Cruise Itinerary`,
    description: 'View a Baha Buddy Nassau cruise-day itinerary with stops, timing, and return-to-ship guidance.',
  }
}

export default async function NassauCruiseItineraryDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('cruise_itinerary_detail')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!data) notFound()

  const plan = data as GuidedDayPlanDetail
  const hours = `${Math.round(plan.duration_min_minutes / 60)}-${Math.round(plan.duration_max_minutes / 60)} hours`

  return (
    <main className="min-h-screen bg-offwhite">
      <section className="bg-gradient-brand text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
          <Link href="/nassau-cruise-itineraries" className="text-sm font-bold text-brand-50 hover:text-white">
            ← Back to itineraries
          </Link>
          <div className="mt-8 max-w-3xl">
            <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              {plan.area} · {hours} · {plan.mobility_level}
            </p>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight md:text-6xl">{plan.title}</h1>
            {plan.full_description && (
              <p className="mt-6 text-lg leading-relaxed text-brand-50">{plan.full_description}</p>
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/build-my-cruise-day?itinerary=${plan.slug}`} className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 font-bold text-brand-700 shadow-card hover:bg-brand-50">
                Personalize this plan
              </Link>
              <Link href="#timeline" className="inline-flex items-center justify-center rounded-full border border-white/60 px-7 py-3 font-bold text-white hover:bg-white/10">
                View stops
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[1fr_360px]">
        <div id="timeline" className="space-y-6">
          <GuidedDayTimeline stops={plan.stops || []} />
        </div>
        <aside className="space-y-6">
          <ReturnSafetyCard />
          <div className="rounded-baha-xl border border-sand-200 bg-white p-6 shadow-card">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Plan options</p>
            <div className="mt-4 space-y-3 text-sm text-charcoal">
              <div className="flex justify-between"><span>Ready-made</span><strong>${plan.base_price.toFixed(2)}</strong></div>
              <div className="flex justify-between"><span>Personalized</span><strong>${plan.personalized_price.toFixed(2)}</strong></div>
              <div className="flex justify-between"><span>Concierge</span><strong>{plan.concierge_price ? `$${plan.concierge_price.toFixed(2)}+` : 'Request'}</strong></div>
            </div>
            <Link href={`/build-my-cruise-day?itinerary=${plan.slug}`} className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">
              Build my cruise day
            </Link>
          </div>
        </aside>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  )
}
