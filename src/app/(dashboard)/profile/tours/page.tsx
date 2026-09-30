import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import TourCover from '@/components/guided-day/TourCover'
import OpenInAppInstructions from '@/components/tours/OpenInAppInstructions'
import { islandDisplayName } from '@/lib/island-config'
import {
  entitlementSourceLabel,
  getCatalogToursByIds,
  getMyTourEntitlements,
  tourDurationLabel,
  tourStopCountLabel,
} from '@/lib/self-guided-tours'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Tours | Baha Buddy',
  description: 'Self-guided tours in your Baha Buddy account.',
  robots: { index: false },
}

function grantedLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** /profile/tours — account-owned self-guided tours (tour_entitlements). */
export default async function MyToursPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/profile/tours')

  const entitlements = await getMyTourEntitlements(supabase)
  const tours = await getCatalogToursByIds(supabase, entitlements.map((row) => row.tour_id))
  const toursById = new Map(tours.map((tour) => [tour.id, tour]))

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-night">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Profile
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-night">My tours</h1>
        <p className="mt-1 text-sm text-gray-500">
          {entitlements.length === 0
            ? 'Self-guided tours you add or buy will show up here.'
            : `${entitlements.length} ${entitlements.length === 1 ? 'tour' : 'tours'} in your account.`}
        </p>
      </div>

      {entitlements.length === 0 ? (
        <section className="mb-8 rounded-baha-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-charcoal">You have not added any self-guided tours yet.</p>
          <Link href="/tours" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">
            Browse self-guided tours
          </Link>
        </section>
      ) : (
        <ul className="mb-8 grid gap-5 sm:grid-cols-2">
          {entitlements.map((row) => {
            const tour = toursById.get(row.tour_id)
            const title = tour?.title ?? 'Self-guided tour'
            const facts = [
              islandDisplayName(tour?.island),
              tourDurationLabel(tour?.duration_minutes),
              tourStopCountLabel(tour?.stop_count),
            ].filter(Boolean)
            return (
              <li key={row.id} className="overflow-hidden rounded-baha-lg border border-gray-200 bg-white shadow-sm">
                <TourCover src={tour?.cover_image_url} title={title} sizes="(max-width: 639px) 100vw, 50vw" />
                <div className="p-4">
                  <h2 className="text-base font-bold text-night">{title}</h2>
                  {facts.length > 0 && <p className="mt-1 text-sm text-charcoal">{facts.join(' · ')}</p>}
                  <p className="mt-2 text-xs text-gray-500">
                    {entitlementSourceLabel(row)}
                    {grantedLabel(row.granted_at) ? ` · ${grantedLabel(row.granted_at)}` : ''}
                  </p>
                  {tour ? (
                    <Link href={`/tours/${row.tour_id}`} className="mt-3 inline-flex text-sm font-semibold text-brand-600 hover:text-brand-700">
                      View tour details
                    </Link>
                  ) : (
                    <p className="mt-3 text-sm text-gray-600">This tour is not currently listed. Contact support if you need help with it.</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <OpenInAppInstructions email={user.email} />
    </main>
  )
}
