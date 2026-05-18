/**
 * Loading skeleton for /explore/places/[island].
 *
 * Mirrors the page's coarse structure: header + hero + stat row + a
 * couple of content sections. Keeps the layout shift to zero while
 * Sanity + Supabase fetches resolve.
 */

import { Skeleton } from '@/components/ui'

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
      </header>

      {/* Hero */}
      <div className="relative h-72 md:h-96 bg-stone-200 overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 max-w-6xl mx-auto space-y-2">
          <Skeleton className="h-3 w-40 bg-white/40" />
          <Skeleton className="h-10 w-64 bg-white/60" />
          <Skeleton className="h-5 w-96 bg-white/40 max-w-full" />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-10 bg-brand-50 rounded-2xl p-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-3 w-16 mx-auto" />
              <Skeleton className="h-5 w-24 mx-auto" />
            </div>
          ))}
        </div>

        {/* Overview */}
        <section className="mb-12 max-w-3xl space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-10/12" />
          <Skeleton className="h-5 w-8/12" />
        </section>

        {/* Things to do — one category */}
        <section className="mb-14 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
                <Skeleton className="aspect-video rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
