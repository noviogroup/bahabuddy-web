type ReturnSafetyCardProps = {
  departureTime?: string | null
  allAboardTime?: string | null
  recommendedReturnTime?: string | null
  latestFinalStopDeparture?: string | null
}

export default function ReturnSafetyCard({
  departureTime,
  allAboardTime,
  recommendedReturnTime,
  latestFinalStopDeparture,
}: ReturnSafetyCardProps) {
  return (
    <section className="rounded-baha-xl border border-gold-200 bg-gold-50 p-5 shadow-soft">
      <p className="text-sm font-bold uppercase tracking-wide text-gold-800">Return-to-ship safety buffer</p>
      <h2 className="mt-2 text-2xl font-extrabold text-night">Know when to head back.</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-baha-md bg-white p-4">
          <p className="text-xs font-bold uppercase text-gray-400">Ship departure</p>
          <p className="mt-1 text-lg font-extrabold text-night">{departureTime || 'Add ship time'}</p>
        </div>
        <div className="rounded-baha-md bg-white p-4">
          <p className="text-xs font-bold uppercase text-gray-400">All aboard</p>
          <p className="mt-1 text-lg font-extrabold text-night">{allAboardTime || 'Usually before departure'}</p>
        </div>
        <div className="rounded-baha-md bg-white p-4">
          <p className="text-xs font-bold uppercase text-gray-400">Recommended return</p>
          <p className="mt-1 text-lg font-extrabold text-brand-700">{recommendedReturnTime || '90 min buffer'}</p>
        </div>
        <div className="rounded-baha-md bg-white p-4">
          <p className="text-xs font-bold uppercase text-gray-400">Latest final-stop departure</p>
          <p className="mt-1 text-lg font-extrabold text-brand-700">{latestFinalStopDeparture || 'Before return buffer'}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-charcoal">
        Baha Buddy plans should always keep a conservative buffer. Travelers remain responsible for checking official cruise line boarding times.
      </p>
    </section>
  )
}
