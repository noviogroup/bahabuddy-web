import Link from 'next/link'

/**
 * 404 page for the (dashboard) route group.
 *
 * Triggered when `notFound()` is called inside any page in the group
 * (e.g. trip detail when the trip ID doesn't exist or belongs to another
 * user, or checkout when the trip param doesn't resolve).
 *
 * Renders inside the dashboard shell so the user keeps their sidebar nav
 * and the chat panel — they can navigate away or keep chatting with
 * Buddy without losing context.
 *
 * Server component — no client state needed.
 */
export default function DashboardNotFound() {
  return (
    <main className="max-w-xl mx-auto px-4 py-16">
      <div className="bg-white rounded-baha-lg border border-gray-200 p-8 sm:p-10 shadow-soft text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-50 mb-4">
          <svg
            className="w-7 h-7 text-brand-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-night mb-2">We couldn&apos;t find that</h1>
        <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
          The page you were looking for doesn&apos;t exist, or you don&apos;t have access to it.
          That trip might have been deleted, or the link might be wrong.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors shadow-card"
          >
            Back to dashboard
          </Link>
          <Link
            href="/trip"
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors border border-gray-200"
          >
            See all trips
          </Link>
        </div>
      </div>
    </main>
  )
}
