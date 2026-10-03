import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import ChatWidget from '@/components/ChatWidget'
import Footer from '@/components/Footer'
import TrackView from '@/components/TrackView'
import ApprovedActivityDetail from '@/components/detail/ApprovedActivityDetail'
import {
  approvedActivityDetailHref,
  getActivitiesWithCanonicalFallback,
} from '@/lib/approved-activities'
import { islandDisplayName } from '@/lib/island-config'
import { requestCache } from '@/lib/request-cache'
import { createPublicClient } from '@/lib/supabase/public'

/**
 * /explore/activities/[id] — public activity detail.
 *
 * Crawlable, sign-in-free copy of the dashboard's /activities/[id] page.
 * Public activity cards, catalog search and the sitemap link here. Canonical
 * attraction ids redirect to their catalog place page, like the dashboard.
 */
export const revalidate = 300

// No paths at build time: each page is rendered on its first request and
// then served from the ISR cache for `revalidate` seconds. Without this,
// Next renders a dynamic [id] route on every request.
export async function generateStaticParams() {
  return []
}

interface PageProps {
  params: { id: string }
}

// generateMetadata and the page both need the activity: one RPC per request.
const getActivity = requestCache(async (id: string) => {
  return getActivitiesWithCanonicalFallback(createPublicClient(), { activityId: id, limit: 1 })
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { approved } = await getActivity(params.id)
    const activity = approved[0]
    if (!activity) return {}
    const island = islandDisplayName(activity.island_slug)
    return {
      title: `${activity.name}${island ? ` — ${island}` : ''} | Baha Buddy`,
      description: activity.description.slice(0, 160),
      alternates: { canonical: approvedActivityDetailHref(activity.activity_id) },
    }
  } catch {
    return {}
  }
}

export default async function PublicActivityDetailPage({ params }: PageProps) {
  const { approved, canonical } = await getActivity(params.id)
  const [activity] = approved
  if (!activity) {
    const place = canonical[0]
    if (place) redirect(`/explore/places/${encodeURIComponent(place.slug ?? place.id)}`)
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <TrackView
        event="activity_viewed"
        props={{ activity_id: activity.activity_id, activity_name: activity.name, island: activity.island_slug }}
      />
      <ApprovedActivityDetail
        activity={activity}
        detailPath={approvedActivityDetailHref(activity.activity_id)}
      />
      <Footer />
      <ChatWidget />
    </div>
  )
}
