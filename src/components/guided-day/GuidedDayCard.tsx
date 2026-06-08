import Link from 'next/link'
import type { GuidedDayPlan } from '@/lib/guided-day/types'

type GuidedDayCardProps = {
  plan: GuidedDayPlan
}

export default function GuidedDayCard({ plan }: GuidedDayCardProps) {
  const hours = `${Math.round(plan.duration_min_minutes / 60)}-${Math.round(plan.duration_max_minutes / 60)} hrs`

  return (
    <article className="rounded-baha-xl border border-sand-200 bg-white p-6 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{plan.area}</p>
          <h3 className="mt-2 text-xl font-extrabold text-night">{plan.title}</h3>
        </div>
        <p className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
          ${plan.base_price.toFixed(2)}
        </p>
      </div>

      {plan.short_description && (
        <p className="mt-3 text-sm leading-relaxed text-charcoal">{plan.short_description}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-charcoal">
        <span className="rounded-full bg-sand-100 px-3 py-1">{hours}</span>
        <span className="rounded-full bg-sand-100 px-3 py-1">{plan.mobility_level}</span>
        <span className="rounded-full bg-sand-100 px-3 py-1">{plan.budget_level}</span>
      </div>

      <Link
        href={`/nassau-cruise-itineraries/${plan.slug}`}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
      >
        View itinerary
      </Link>
    </article>
  )
}
