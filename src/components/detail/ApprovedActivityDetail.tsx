import Link from 'next/link'

import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import DirectTripItemActions from '@/components/trip/DirectTripItemActions'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'
import {
  activityBookingLabel,
  activityDurationLabel,
  activityPriceLabel,
  approvedActivityCard,
  factLabel,
  sourceAsOfLabel,
  type ApprovedActivityRow,
} from '@/lib/approved-activities'
import { islandDisplayName } from '@/lib/island-config'

/**
 * Activity detail body shared by the public route (/explore/activities/[id])
 * and the signed-in dashboard route (/activities/[id]). `detailPath` is the
 * route the page is served from, so trip actions return to the same place.
 */
export default function ApprovedActivityDetail({
  activity,
  detailPath,
}: {
  activity: ApprovedActivityRow
  detailPath: string
}) {
  const card = approvedActivityCard(activity)
  const islandSlug = activity.island_slug
  const islandName = islandDisplayName(islandSlug)
  const image = card.photo_url ?? null
  const sourceUrl = activity.source_url?.trim() || null
  const browseHref = `/explore/places?category=Activity&island=${encodeURIComponent(islandSlug)}`
  const facts = [
    ['Duration', activityDurationLabel(activity.duration)],
    ['Price basis', activityPriceLabel(activity.price_basis, activity.booking_quote_state)],
    ['Booking', activityBookingLabel(activity.booking_quote_state)],
    ['Meeting / pickup', factLabel(activity.meeting_pickup)],
    ['Group / age limits', factLabel(activity.group_age_limits)],
    ['Safety / access', factLabel(activity.safety_access)],
    ['Cancellation', factLabel(activity.cancellation)],
    ['Source status', sourceAsOfLabel(activity.source_checked_at, activity.source_recheck_at)],
  ] as const

  return (
    <>
      <CompactPageHeader
        eyebrow="Experience detail"
        title={activity.name}
        subtitle={activity.description}
        crumbs={[
          { href: '/explore', label: 'Explore' },
          { href: browseHref, label: 'Activities' },
          { label: activity.name },
        ]}
        actions={(
          <Link href={browseHref} className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night transition-colors hover:bg-gray-50">
            Browse more activities
          </Link>
        )}
      >
        <div className="flex flex-wrap gap-2">
          {activity.category_tags.map((tag) => (
            <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
              {tag.replaceAll('-', ' ').replaceAll('_', ' ')}
            </span>
          ))}
        </div>
      </CompactPageHeader>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:items-start">
          <ImageWithSourcePolicy
            src={image}
            alt={activity.name}
            title={activity.name}
            eyebrow="Experience photo"
            className="aspect-[4/3] rounded-baha-lg border border-gray-200 bg-white shadow-sm sm:aspect-[16/10] lg:aspect-[4/3]"
            imageClassName="object-cover"
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
            tone="activity"
          >
            <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-night shadow-sm">
              {islandName}
            </div>
          </ImageWithSourcePolicy>

          <div id="trip-actions">
            <DirectTripItemActions
              itemType="activity"
              sourceId={activity.activity_id}
              sourceType="approved_activity"
              name={activity.name}
              island={islandName}
              imageUrl={image}
              returnPath={`${detailPath}#trip-actions`}
              heading="Save this experience"
              description="Saving does not reserve a place. Check price and availability with the provider before you go."
              primaryLabel="Add experience to trip"
              createTripLabel="Create trip for this experience"
              savedLabel="Saved experience to trip"
              timeSlot="afternoon"
              notes={activity.description.slice(0, 180)}
              metadata={{
                activityId: activity.activity_id,
                islandSlug,
                sourceRecordId: activity.source_record_id,
                sourceLayer: activity.source_layer,
                bookingQuoteState: activity.booking_quote_state,
                sourceCheckedAt: activity.source_checked_at,
              }}
            />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-night">About this experience</h2>
            <p className="mt-3 leading-relaxed text-gray-700">{activity.description}</p>
          </div>

          <aside className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Provider facts</p>
            <dl className="mt-4 space-y-4 text-sm">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-bold text-night">{label}</dt>
                  <dd className="mt-1 text-charcoal">{value ?? 'Not listed'}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-900">
              These details were checked on the date shown and can change. Confirm price and availability with the provider before booking.
            </p>
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-sm font-bold text-brand-700 hover:text-brand-800">
                View source<span className="sr-only"> (opens in new tab)</span>
              </a>
            )}
          </aside>
        </section>

        <div className="mt-8">
          <PlanWithBuddyCTA
            planPrompt={`I'm looking at "${activity.name}" on ${islandName}. Tell me what to expect and what I should confirm with the provider before booking.`}
            addPrompt={`Help me plan around "${activity.name}" on ${islandName}.`}
            kind="experience"
          />
        </div>
      </main>
    </>
  )
}
