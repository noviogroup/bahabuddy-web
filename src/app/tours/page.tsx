import type { Metadata } from 'next'
import Link from 'next/link'

import ChatWidget from '@/components/ChatWidget'
import Footer from '@/components/Footer'
import TourCover from '@/components/guided-day/TourCover'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import { OwnedToursProvider, TourPriceBadge } from '@/components/tours/OwnedTours'
import { islandDisplayName } from '@/lib/island-config'
import {
  getSelfGuidedCatalog,
  tourDurationLabel,
  tourPriceLabel,
  tourStopCountLabel,
  type SelfGuidedCatalogTour,
} from '@/lib/self-guided-tours'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Self-Guided Tours | Baha Buddy',
  description: 'Self-guided Bahamas tours you can add to your Baha Buddy account and start in the app.',
}

async function loadCatalog(): Promise<SelfGuidedCatalogTour[]> {
  try {
    return await getSelfGuidedCatalog(await createClient())
  } catch {
    return []
  }
}

export default async function ToursPage() {
  const tours = await loadCatalog()

  return (
    <div className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Self-guided tours"
        title="Self-guided tours"
        subtitle="Pick a tour, add it to your account, then start it in the Baha Buddy app."
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/explore', label: 'Explore' },
          { label: 'Self-guided tours' },
        ]}
      />

      <main className="mx-auto max-w-6xl px-4 py-10">
        {tours.length === 0 ? (
          <section className="rounded-baha-lg border border-gray-200 bg-white p-6 text-center">
            <h2 className="text-lg font-bold text-night">No self-guided tours are listed right now</h2>
            <p className="mt-2 text-sm text-charcoal">Check back soon, or plan a cruise day in Nassau.</p>
            <Link href="/nassau-cruise-itineraries" className="mt-4 inline-flex text-sm font-semibold text-brand-600 hover:text-brand-700">
              Nassau cruise day plans
            </Link>
          </section>
        ) : (
          <OwnedToursProvider>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tours.map((tour) => {
                const facts = [
                  islandDisplayName(tour.island),
                  tourDurationLabel(tour.duration_minutes),
                  tourStopCountLabel(tour.stop_count),
                ].filter(Boolean)
                return (
                  <li key={tour.id}>
                    <Link
                      href={`/tours/${tour.id}`}
                      className="group block overflow-hidden rounded-baha-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                    >
                      <div className="relative">
                        <TourCover src={tour.cover_image_url} title={tour.title} />
                        <div className="absolute right-3 top-3">
                          <TourPriceBadge tourId={tour.id} priceCents={tour.price_cents} priceLabel={tourPriceLabel(tour.price_cents, tour.currency)} />
                        </div>
                      </div>
                      <div className="p-4">
                        <h2 className="text-base font-bold text-night group-hover:text-brand-700">{tour.title}</h2>
                        {facts.length > 0 && <p className="mt-1 text-sm text-charcoal">{facts.join(' · ')}</p>}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </OwnedToursProvider>
        )}

        <p className="mt-10 text-sm text-charcoal">
          Visiting on a cruise?{' '}
          <Link href="/nassau-cruise-itineraries" className="font-semibold text-brand-600 hover:text-brand-700">
            See Nassau cruise day plans
          </Link>
          .
        </p>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}
