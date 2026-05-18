import { Skeleton } from '@/components/ui'

/**
 * Loading skeleton for the trip index (`/trip`).
 * Mimics the header + grid layout of TripIndexPage.
 */
export default function TripIndexLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" rounded="full" />
      </div>

      {/* Grid skeleton — 6 trip card placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-baha-lg border border-gray-200 overflow-hidden shadow-soft">
            <Skeleton className="h-48 w-full" rounded="none" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-1.5 pt-2">
                <Skeleton className="h-5 w-16" rounded="full" />
                <Skeleton className="h-5 w-20" rounded="full" />
              </div>
              <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
