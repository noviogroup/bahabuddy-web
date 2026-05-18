import { Skeleton } from '@/components/ui'

/**
 * Generic loading state for any page inside the (dashboard) group that
 * doesn't have its own loading.tsx. Renders a content-area shell so the
 * sidebar and chat panel (already rendered by the layout) stay visible
 * during navigation.
 *
 * More specific loading.tsx files in /trip/[id]/, /checkout/, /profile/,
 * /explore/, /trip/ override this one for those routes.
 */
export default function DashboardLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" rounded="lg" />
        <Skeleton className="h-32 w-full" rounded="lg" />
      </div>
    </main>
  )
}
