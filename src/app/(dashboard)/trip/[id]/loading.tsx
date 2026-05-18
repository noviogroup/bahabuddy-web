import { Skeleton } from '@/components/ui'

/**
 * Loading skeleton for the trip detail page (`/trip/[id]`).
 * Mimics back link + hero + tabs + content.
 */
export default function TripDetailLoading() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-24" />

      {/* Hero card */}
      <div className="bg-white rounded-baha-lg border border-gray-200 overflow-hidden shadow-card">
        <Skeleton className="h-48 sm:h-56 w-full" rounded="none" />
        <div className="p-6 space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-20" rounded="full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10" rounded="full" />
              <Skeleton className="h-10 w-10" rounded="full" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-7 w-24" rounded="full" />
            <Skeleton className="h-7 w-24" rounded="full" />
          </div>
          <div className="grid grid-cols-3 gap-4 pt-5 border-t border-gray-100">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Skeleton className="h-11 w-80" rounded="full" />

      {/* Timeline content */}
      <div className="space-y-4">
        <Skeleton className="h-36 w-full" rounded="lg" />
        <Skeleton className="h-36 w-full" rounded="lg" />
      </div>
    </main>
  )
}
