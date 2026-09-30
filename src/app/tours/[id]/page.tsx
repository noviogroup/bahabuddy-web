import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import ChatWidget from '@/components/ChatWidget'
import Footer from '@/components/Footer'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import TrackView from '@/components/TrackView'
import TourGetCta from '@/components/tours/TourGetCta'
import {
  APPROVED_ACTIVITY_PAGE_LIMIT,
  activityDurationLabel,
  activityPriceLabel,
  approvedActivityCard,
  factLabel,
  getApprovedActivities,
  isUuid,
  sourceAsOfLabel,
  type ApprovedActivityRow,
} from '@/lib/approved-activities'
import { islandDisplayName } from '@/lib/island-config'
import {
  getCatalogTour,
  getPreviewStops,
  previewStopName,
  previewStopSummary,
  tourDurationLabel,
  tourPriceLabel,
  tourStopCountLabel,
  type SelfGuidedCatalogTour,
  type TourPreviewStop,
} from '@/lib/self-guided-tours'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 300

interface PageProps {
  params: { id: string }
}

const isSelfTour = (row: ApprovedActivityRow) => row.source_layer === 'self_tours'

async function getApprovedTour(id: string): Promise<ApprovedActivityRow | null> {
  try {
    const supabase = await createClient()
    // Island guide tiles link by activity id, which the RPC matches exactly.
    if (isUuid(id)) {
      const [row] = await getApprovedActivities(supabase, { activityId: id, limit: 1 })
      if (row && isSelfTour(row)) return row
    }
    // Older links carry the self_tours record id, which the RPC cannot filter
    // on, so search its full page rather than a partial one.
    const rows = await getApprovedActivities(supabase, { limit: APPROVED_ACTIVITY_PAGE_LIMIT })
    return rows.find((row) => isSelfTour(row) && row.source_record_id === id) ?? null
  } catch {
    return null
  }
}

interface TourPageData {
  approved: ApprovedActivityRow | null
  /** v_self_guided_catalog row: price, stops and the purchasable tour id. */
  catalog: SelfGuidedCatalogTour | null
  previewStops: TourPreviewStop[]
}

async function getTour(id: string): Promise<TourPageData | null> {
  const approved = await getApprovedTour(id)
  // The approved projection's source_record_id is the self_tours id. Catalog
  // links (/tours) use that id directly, so fall back to it.
  const selfTourId = approved?.source_record_id ?? id
  let catalog: SelfGuidedCatalogTour | null = null
  let previewStops: TourPreviewStop[] = []
  try {
    const supabase = await createClient()
    catalog = await getCatalogTour(supabase, selfTourId)
    if (catalog) previewStops = await getPreviewStops(supabase, catalog)
  } catch {
    catalog = null
  }
  if (!approved && !catalog) return null
  return { approved, catalog, previewStops }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getTour(params.id)
  if (!data) return {}
  const name = data.approved?.name ?? data.catalog?.title ?? 'Self-guided tour'
  return {
    title: `${name} — Self-Guided Tour | Baha Buddy`,
    description: data.approved?.description ?? `Self-guided tour: ${name}.`,
  }
}

export default async function TourDetailPage({ params }: PageProps) {
  const data = await getTour(params.id)
  if (!data) notFound()
  const { approved: tour, catalog, previewStops } = data

  const name = tour?.name ?? catalog?.title ?? 'Self-guided tour'
  const description = tour?.description ?? undefined
  const islandSlug = tour?.island_slug ?? catalog?.island ?? null
  const photoUrl = (tour ? approvedActivityCard(tour).photo_url : null) ?? catalog?.cover_image_url ?? null
  const remainingStops = catalog?.stop_count != null ? Math.max(catalog.stop_count - previewStops.length, 0) : 0

  const facts: Array<readonly [string, string | null]> = [
    ['Island', islandSlug ? islandDisplayName(islandSlug) : null],
    ['Duration', tourDurationLabel(catalog?.duration_minutes) ?? (tour ? activityDurationLabel(tour.duration) : null)],
    ['Stops', tourStopCountLabel(catalog?.stop_count)],
    ['Price', catalog ? tourPriceLabel(catalog.price_cents, catalog.currency) : tour ? activityPriceLabel(tour.price_basis, tour.booking_quote_state) : null],
    ...(tour
      ? ([
          ['Meeting / pickup', factLabel(tour.meeting_pickup)],
          ['Group / age limits', factLabel(tour.group_age_limits)],
          ['Safety / access', factLabel(tour.safety_access)],
          ['Cancellation', factLabel(tour.cancellation)],
          ['Source status', sourceAsOfLabel(tour.source_checked_at, tour.source_recheck_at)],
        ] as const)
      : []),
  ]

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="tour_viewed" props={{ tour_id: catalog?.id ?? tour?.source_record_id ?? params.id, tour_title: name, island: islandSlug }} />

      <CompactPageHeader
        eyebrow="Self-guided tour"
        title={name}
        subtitle={description}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/tours', label: 'Self-guided tours' },
          { label: name },
        ]}
      />

      <main className="mx-auto max-w-4xl px-4 py-10">
        <ImageWithSourcePolicy
          src={photoUrl}
          alt={name}
          title={name}
          eyebrow="Tour"
          tone="activity"
          className="mb-8 h-64 rounded-baha-xl border border-gray-200 shadow-sm sm:aspect-[16/7] sm:h-auto sm:min-h-[240px]"
          imageClassName="object-cover"
          sizes="(max-width: 768px) 100vw, 900px"
          priority
        />

        <section className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-night">Tour details</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm font-bold text-night">{label}</dt>
                <dd className="mt-1 text-sm text-charcoal">{value ?? 'Not listed'}</dd>
              </div>
            ))}
          </dl>
        </section>

        {catalog && (
          <div className="mt-6">
            <TourGetCta
              tourId={catalog.id}
              title={name}
              priceCents={catalog.price_cents}
              currency={catalog.currency}
            />
          </div>
        )}

        {previewStops.length > 0 ? (
          <section aria-labelledby="tour-preview-heading" className="mt-6 rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 id="tour-preview-heading" className="text-lg font-bold text-night">Preview the first stops</h2>
            <ol className="mt-4 space-y-4">
              {previewStops.map((stop, index) => {
                const summary = previewStopSummary(stop)
                return (
                  <li key={stop.id} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-night">{previewStopName(stop.name)}</p>
                      {summary && <p className="mt-1 line-clamp-2 text-sm text-charcoal">{summary}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
            {remainingStops > 0 && (
              <p className="mt-4 text-sm text-gray-600">
                {remainingStops} more {remainingStops === 1 ? 'stop' : 'stops'} with directions and narration in the Baha Buddy app.
              </p>
            )}
          </section>
        ) : (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <h2 className="font-bold text-amber-950">Route map not available yet</h2>
            <p className="mt-2 text-sm text-amber-900">
              A stop-by-stop route and map for this tour are not available yet. Check opening times and transport before you set out.
            </p>
          </section>
        )}

        <div className="mt-10">
          <Link
            href={tour ? `/explore/island/${tour.island_slug}` : '/tours'}
            className="inline-flex text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            {tour ? 'Back to island guide' : 'All self-guided tours'}
          </Link>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}
