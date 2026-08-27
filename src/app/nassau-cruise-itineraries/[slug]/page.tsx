import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import GuidedDayTimeline from '@/components/guided-day/GuidedDayTimeline'
import ReturnSafetyCard from '@/components/guided-day/ReturnSafetyCard'
import { createClient } from '@/lib/supabase/server'
import type { GuidedDayPlanDetail } from '@/lib/guided-day/types'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'

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
    <main className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Cruise-safe Nassau itinerary"
        title={plan.title}
        subtitle={plan.full_description ?? 'Follow a one-day Nassau plan with practical stops, timing, and return-to-ship guidance.'}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/nassau-cruise-itineraries', label: 'Guided tours' },
          { label: plan.title },
        ]}
        actions={(
          <>
            <Link href={`/build-my-cruise-day?itinerary=${plan.slug}`} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700">
              Personalize this plan
            </Link>
            <Link href="#timeline" className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50">
              View stops
            </Link>
          </>
        )}
      >
        <div className="flex flex-wrap gap-2 text-xs font-bold text-charcoal">
          {[plan.area, hours, plan.mobility_level, plan.budget_level].filter(Boolean).map((item) => (
            <span key={item} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </CompactPageHeader>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <div id="timeline" className="space-y-6">
          <GuidedDayTimeline stops={plan.stops || []} />
        </div>
        <aside className="space-y-6">
          <ReturnSafetyCard />
          <div className="rounded-baha-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase text-brand-700">Plan options</p>
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
