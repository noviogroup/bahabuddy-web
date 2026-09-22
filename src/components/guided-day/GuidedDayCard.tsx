import Link from 'next/link'
import type { GuidedDayPlan } from '@/lib/guided-day/types'
import TourCover from '@/components/guided-day/TourCover'
import { tourDurationLabel } from '@/lib/guided-day/display'

type GuidedDayCardProps = {
  plan: GuidedDayPlan
}

export default function GuidedDayCard({ plan }: GuidedDayCardProps) {
  const hours = tourDurationLabel(plan.duration_min_minutes, plan.duration_max_minutes)

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-baha-xl border border-gray-200 bg-white shadow-sm">
      <TourCover src={plan.hero_image_url} title={plan.title} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase text-brand-700">
              {plan.area}
            </p>
            <h3 className="mt-2 text-xl font-bold text-night">{plan.title}</h3>
          </div>
          <p className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-brand-700">
            {plan.base_price === 0 ? 'Free' : `$${plan.base_price.toFixed(2)}`}
          </p>
        </div>

        {plan.short_description && (
          <p className="mt-3 text-sm leading-relaxed text-charcoal">{plan.short_description}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-charcoal">
          <span className="rounded-full bg-gray-100 px-3 py-1">{hours}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1">{plan.mobility_level}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1">{plan.budget_level}</span>
        </div>

        <div className="flex-1" />
        <Link
          href={`/nassau-cruise-itineraries/${plan.slug}`}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          View itinerary
        </Link>
      </div>
    </article>
  )
}
