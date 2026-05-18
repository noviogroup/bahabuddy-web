import HotelSearchClient from './HotelSearchClient'
import Link from 'next/link'

/**
 * /hotels — direct hotel search.
 *
 * Parallel to the chat-mediated get_hotels tool. Users who want to
 * browse the lodging catalog directly land here. Each result card
 * links to /hotels/[id] for full detail + the "Plan with Buddy" CTA.
 *
 * Data source: google_places (lodging type). Will switch to LiteAPI
 * once the web-side hotels-stays-proxy ships. At that point check-in
 * and check-out dates become real inputs that drive live pricing.
 *
 * Auth: handled by the (dashboard) layout. API enforces it too.
 *
 * Note: this is the index page. The dynamic detail route
 *   src/app/(dashboard)/hotels/[id]/page.tsx
 * already exists and continues to handle /hotels/<place_id> URLs.
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Browse hotels | Baha Buddy',
  description:
    'Browse hand-picked hotels, resorts, and villas across the Bahamas. Filter by island, price, and rating.',
}

export default function HotelsSearchPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-12 space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-night transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold text-night">Browse hotels</h1>
        <p className="text-sm text-gray-500 mt-1">
          Hand-picked Bahamas hotels and resorts. Filter by island, price,
          and rating — tap a card for full details.{' '}
          <Link href="/dashboard/chat" className="text-brand-600 hover:text-brand-700 underline-offset-2 hover:underline">
            Prefer to chat?
          </Link>
        </p>
      </header>

      <HotelSearchClient />
    </main>
  )
}
