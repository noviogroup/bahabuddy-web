import Link from 'next/link'

export default function MarketingTopBar() {
  return (
    <div
      role="region"
      aria-label="Special offer"
      className="w-full bg-gold-500 text-night border-b border-gold-600/25"
    >
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-center">
        <p className="text-sm font-semibold tracking-wide">
          Book a 5-day stay and get a complimentary snorkeling trip.
        </p>
        <Link
          href="/deals"
          className="text-sm font-bold text-brand-800 hover:text-brand-900 underline underline-offset-2 whitespace-nowrap transition-colors"
        >
          View offer →
        </Link>
      </div>
    </div>
  )
}
