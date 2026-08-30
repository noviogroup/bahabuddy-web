/**
 * Loading skeleton for /explore/island/[id]. Mirrors the page's
 * coarse structure: compact header + supporting media + content sections.
 * Keeps layout shift at zero while Sanity + Supabase fetches resolve.
 */

import { Skeleton } from '@/components/ui'

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <Skeleton className="mb-3 h-4 w-52" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Skeleton className="mb-2 h-3 w-28" />
              <Skeleton className="mb-3 h-10 w-72 max-w-full" />
              <Skeleton className="h-5 w-full max-w-xl" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-36 rounded-full" />
              <Skeleton className="h-10 w-28 rounded-full" />
              <Skeleton className="h-10 w-28 rounded-full" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <Skeleton className="mb-10 h-64 w-full rounded-baha-xl sm:aspect-[16/7] sm:h-auto sm:min-h-[240px]" />

        <div className="grid grid-cols-3 gap-4 mb-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-3 w-16 mx-auto" />
              <Skeleton className="h-5 w-24 mx-auto" />
            </div>
          ))}
        </div>

        <section className="mb-12 max-w-3xl space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-10/12" />
          <Skeleton className="h-5 w-8/12" />
        </section>

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
