import { notFound, redirect } from 'next/navigation'

import ApprovedActivityDetail from '@/components/detail/ApprovedActivityDetail'
import { getActivitiesWithCanonicalFallback } from '@/lib/approved-activities'
import { createClient } from '@/lib/supabase/server'

/**
 * /activities/[id] — signed-in activity detail inside the dashboard shell.
 *
 * Public cards, search results and the sitemap link to the public copy at
 * /explore/activities/[id] instead, because this route group redirects
 * anonymous visitors to /login.
 */
export const dynamic = 'force-dynamic'

export default async function ActivityDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { approved, canonical } = await getActivitiesWithCanonicalFallback(supabase, {
    activityId: params.id,
    limit: 1,
  })
  const [activity] = approved
  if (!activity) {
    // Canonical attraction cards (shown while no reviewed offer exists) open
    // the catalog place page, which carries no price or availability claims.
    const place = canonical[0]
    if (place) redirect(`/explore/places/${encodeURIComponent(place.slug ?? place.id)}`)
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <ApprovedActivityDetail
        activity={activity}
        detailPath={`/activities/${encodeURIComponent(activity.activity_id)}`}
      />
    </div>
  )
}
