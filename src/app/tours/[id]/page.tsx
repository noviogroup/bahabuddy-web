import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { createClient } from '@/lib/supabase/server'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'
import TrackView from '@/components/TrackView'

export const revalidate = 300

interface TourStop {
  id: string
  sequence: number
  name: string
  description: string | null
  lat: number
  lng: number
  audio_url: string | null
  image_urls: string[]
  duration_sec: number | null
}

interface Tour {
  id: string
  title: string
  island: string
  theme: string | null
  estimated_duration: number | null
  difficulty: string | null
  cover_image_url: string | null
  cruise_friendly: boolean
  featured: boolean
}

interface PageProps {
  params: { id: string }
}

async function getTour(id: string): Promise<Tour | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('self_tours')
      .select('id, title, island, theme, estimated_duration, difficulty, cover_image_url, cruise_friendly, featured')
      .eq('id', id)
      .eq('is_active', true)
      .single()
    return data as Tour | null
  } catch {
    return null
  }
}

async function getTourStops(tourId: string): Promise<TourStop[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tour_stops')
      .select('id, sequence, name, description, lat, lng, audio_url, image_urls, duration_sec')
      .eq('tour_id', tourId)
      .order('sequence', { ascending: true })
    return (data as TourStop[]) ?? []
  } catch {
    return []
  }
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return 'Varies'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  challenging: 'bg-orange-100 text-orange-800',
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tour = await getTour(params.id)
  if (!tour) return {}

  return {
    title: `${tour.title} — Self-Guided Tour | Baha Buddy`,
    description: `Explore ${tour.island} with this ${tour.theme ?? 'self-guided'} walking tour. ${tour.estimated_duration ? formatDuration(tour.estimated_duration) + ' estimated.' : ''}`,
  }
}

export default async function TourDetailPage({ params }: PageProps) {
  const tour = await getTour(params.id)
  if (!tour) notFound()

  const stops = await getTourStops(tour.id)

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="tour_viewed" props={{ tour_id: tour.id, tour_title: tour.title, island: tour.island }} />

      <CompactPageHeader
        eyebrow="Self-guided tour"
        title={tour.title}
        subtitle={`${tour.theme ?? 'Walking tour'} on ${tour.island}`}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/explore', label: 'Explore' },
          { label: tour.title },
        ]}
      >
        <div className="flex flex-wrap items-center gap-2">
          {tour.estimated_duration && (
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">
              {formatDuration(tour.estimated_duration)}
            </span>
          )}
          {tour.difficulty && (
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${DIFFICULTY_COLORS[tour.difficulty] ?? 'bg-gray-100 text-gray-800'}`}>
              {tour.difficulty}
            </span>
          )}
          {tour.cruise_friendly && (
            <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
              Cruise-friendly
            </span>
          )}
        </div>
      </CompactPageHeader>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <ImageWithSourcePolicy
          src={tour.cover_image_url}
          alt={tour.title}
          title={tour.title}
          eyebrow="Tour"
          tone="activity"
          className="mb-10 h-64 rounded-baha-xl border border-gray-200 shadow-sm sm:aspect-[16/7] sm:h-auto sm:min-h-[240px]"
          imageClassName="object-cover"
          sizes="(max-width: 768px) 100vw, 900px"
          priority
        />

        {stops.length > 0 ? (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'}
            </h2>
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" aria-hidden="true" />
              <ol className="space-y-6">
                {stops.map((stop, idx) => (
                  <li key={stop.id} className="relative pl-12">
                    <div className="absolute left-3 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white ring-4 ring-white">
                      {idx + 1}
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-base font-bold text-gray-900">{stop.name}</h3>
                        {stop.duration_sec && (
                          <span className="flex-shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-charcoal">
                            {Math.ceil(stop.duration_sec / 60)} min
                          </span>
                        )}
                      </div>
                      {stop.description && (
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">{stop.description}</p>
                      )}
                      {stop.image_urls.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {stop.image_urls.slice(0, 3).map((url, imgIdx) => (
                            <div key={url} className="relative h-24 w-32 flex-shrink-0 rounded-xl overflow-hidden bg-stone-100">
                              <Image
                                src={url}
                                alt={`${stop.name} — photo ${imgIdx + 1}`}
                                fill
                                className="object-cover"
                                sizes="128px"
                                unoptimized
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">Tour stops are being prepared. Check back soon.</p>
          </div>
        )}

        <div className="mt-12">
          <PlanWithBuddyCTA
            kind="experience"
            planPrompt={`Help me plan around the "${tour.title}" tour on ${tour.island}`}
            addPrompt={`Tell me more about the ${tour.title} self-guided tour`}
          />
        </div>

        <div className="mt-10">
          <Link
            href={`/explore/island/${tour.island}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to island guide
          </Link>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}
