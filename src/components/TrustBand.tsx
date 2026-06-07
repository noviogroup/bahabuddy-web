const TRUST_POINTS = [
  'Built in The Bahamas',
  'AI-powered planning',
  'Local concierge review',
  'Visa/document support',
  'Partner-backed recommendations',
]

export default function TrustBand() {
  return (
    <section className="bg-white border-b border-sand-200">
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {TRUST_POINTS.map((point) => (
            <div
              key={point}
              className="rounded-full bg-sand-50 border border-sand-200 px-4 py-3 text-center text-xs sm:text-sm font-bold text-brand-800"
            >
              {point}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
