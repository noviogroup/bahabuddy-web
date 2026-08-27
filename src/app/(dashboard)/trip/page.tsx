import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Trip } from '@/types/database'
import TripCard from '@/components/TripCard'
import { fetchVisibleTrips } from '@/lib/trips/visible-trips'

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
 *   - Empty state for users with 0 trips → direct trip creation CTA
 *
 * "New trip" CTA goes to /dashboard/trips/new so the user creates the
 * canonical trip record first. Buddy remains a secondary planning path.
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

  const tripList = sortTrips(await fetchVisibleTrips(supabase, user.id))

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-night">My Trips</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tripList.length === 0
              ? 'No trips yet. Create one and add stays, flights, food, and tours directly.'
              : `${tripList.length} ${tripList.length === 1 ? 'trip' : 'trips'} planned and saved.`}
          </p>
        </div>
        <Link
          href="/dashboard/trips/new?returnTo=%2Ftrip&source=trip_index"
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        >
          <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
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
        Start with a trip record
      </h2>
      <p className="text-sm text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
        Create the trip first, then add hotels, flights, restaurants, tours, and notes directly.
        Buddy stays available when conversation adds planning value.
      </p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/dashboard/trips/new?returnTo=%2Ftrip&source=trip_index"
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-700"
        >
          <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
          Create trip
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
        <Link
          href={`/dashboard/chat?q=${encodeURIComponent('Help me plan a trip to the Bahamas')}`}
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
        >
          Ask Buddy first
        </Link>
      </div>
    </div>
  )
}
