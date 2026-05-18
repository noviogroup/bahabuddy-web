import { Skeleton } from '@/components/ui'

/** Loading skeleton for `/explore` — header + tabs + article grid. */
export default function ExploreLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Tabs */}
      <Skeleton className="h-11 w-60 mb-6" rounded="full" />

      {/* Article grid — 6 placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-baha-lg border border-gray-200 overflow-hidden shadow-soft">
            <Skeleton className="h-44 w-full" rounded="none" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-32 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
