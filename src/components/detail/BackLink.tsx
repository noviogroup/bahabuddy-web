import Link from 'next/link'

/**
 * BackLink — the small "← Back to …" link rendered at the top of every
 * detail page. Centralized so the visual treatment stays consistent.
 *
 * Detail pages choose where back goes:
 *   - hotels/activities/restaurants → /dashboard/chat (cards live in chat)
 *   - articles → /explore (cards live in the Explore grid)
 *   - destinations → /explore (or marketing /explore/places parent)
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mb-6">
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 rounded"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {label}
      </Link>
    </div>
  )
}
