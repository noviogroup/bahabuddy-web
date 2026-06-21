import type { GuidedDayStop } from '@/lib/guided-day/types'

type GuidedDayTimelineProps = {
  stops: GuidedDayStop[]
}

function formatOffset(minutes: number | null) {
  if (minutes === null || minutes === undefined) return 'Flexible'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins.toString().padStart(2, '0')}m after start`
}

export default function GuidedDayTimeline({ stops }: GuidedDayTimelineProps) {
  return (
    <section className="rounded-baha-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-700">
            <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
            Timeline
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-night">Follow the day stop by stop.</h2>
        </div>
        <p className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-brand-700">
          {stops.length} stops
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {stops.map((stop) => (
          <article key={stop.id} className="rounded-baha-lg border border-gray-200 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Stop {stop.stop_order} · {formatOffset(stop.suggested_arrival_offset_minutes)}
                </p>
                <h3 className="mt-1 text-lg font-extrabold text-night">{stop.name}</h3>
                {stop.description && <p className="mt-2 text-sm leading-relaxed text-charcoal">{stop.description}</p>}
              </div>
              <div className="shrink-0 rounded-baha-md bg-gray-100 px-3 py-2 text-sm font-bold text-charcoal">
                {stop.suggested_duration_minutes} min
              </div>
            </div>

            {stop.baha_tip && (
              <div className="mt-4 rounded-baha-md border border-gray-200 bg-gray-50 p-3 text-sm text-charcoal">
                <span className="font-bold">Baha Buddy tip:</span> {stop.baha_tip}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
