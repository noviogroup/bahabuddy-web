import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Trip } from '@/types/database'
import TripCard from '@/components/TripCard'

export const dynamic = 'force-dynamic'

/**
 * /trip — Trip index page (Phase C.3 per UI/UX Spec §6.1).
 *
 * Lists every trip the user owns, smart-sorted:
 *   1. Active (currently traveling)
 *   2. Booked (upcoming first by start date)
 *   3. Planned (upcoming first by start date)
 *   4. Draft (most recently updated first)
 *   5. Completed (most recently completed first)
 *
 * Layout:
 *   - Header with title + count + "New trip" CTA
 *   - Responsive grid: 1 col phone, 2 col tablet, 3 col desktop
 *   - Empty state for users with 0 trips → "Start chatting with Buddy" CTA
 *
 * "New trip" CTA goes to /dashboard/chat?q=Plan a new trip — opening the
 * standalone chat is intentional (full focus on planning, no distractions
 * from a sidebar or other trips).
 *
 * Auth gate: handled by the (dashboard) route group layout.
 */

const STATUS_ORDER: Record<string, number> = {
  active: 0,
  booked: 1,
  planned: 2,
  draft: 3,
  completed: 4,
}

function sortTrips(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    const aRank = STATUS_ORDER[a.status] ?? 99
    const bRank = STATUS_ORDER[b.status] ?? 99
    if (aRank !== bRank) return aRank - bRank

    // Same status — choose appropriate secondary sort
    if (a.status === 'booked' || a.status === 'planned') {
      // Upcoming first
      const aStart = a.date_start ? new Date(a.date_start).getTime() : Infinity
      const bStart = b.date_start ? new Date(b.date_start).getTime() : Infinity
      return aStart - bStart
    }
    // draft / completed / active — most recently touched first
    const aUpd = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
    const bUpd = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
    return bUpd - aUpd
  })
}

export default async function TripIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', user.id)

  const tripList = sortTrips((trips ?? []) as Trip[])

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-night">My Trips</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tripList.length === 0
              ? 'No trips yet — start one with Buddy.'
              : `${tripList.length} ${tripList.length === 1 ? 'trip' : 'trips'} planned and saved.`}
          </p>
        </div>
        <Link
          href={`/dashboard/chat?q=${encodeURIComponent('Plan a new trip to the Bahamas')}`}
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-full transition-colors shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New trip
        </Link>
      </div>

      {tripList.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {tripList.map(trip => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </main>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-baha-lg border border-gray-200 p-10 sm:p-16 text-center shadow-soft">
      <h2 className="text-xl font-bold text-night mb-2">
        Your first Bahamas trip is one chat away
      </h2>
      <p className="text-sm text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
        Tell Buddy what you&apos;re thinking — a vibe, a dream, a rough idea — and a complete
        plan will appear here, ready to book.
      </p>
      <Link
        href={`/dashboard/chat?q=${encodeURIComponent('Help me plan a trip to the Bahamas')}`}
        className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-3 rounded-full transition-colors shadow-card"
      >
        Start planning with Buddy
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </Link>
    </div>
  )
}
