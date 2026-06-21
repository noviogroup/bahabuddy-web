import Skeleton from '@/components/ui/Skeleton'

/**
 * /activities/[id] loading state.
 *
 * Mirrors the compact activity detail layout so the page doesn't jump
 * when the data arrives.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <Skeleton className="mb-3 h-4 w-40" />
          <Skeleton className="mb-3 h-10 w-3/4 max-w-2xl" />
          <Skeleton className="h-5 w-full max-w-3xl" />
          <div className="mt-5 flex flex-wrap gap-2">
            <Skeleton className="h-7 w-24" rounded="full" />
            <Skeleton className="h-7 w-28" rounded="full" />
            <Skeleton className="h-7 w-48" rounded="full" />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <Skeleton className="aspect-[4/3] w-full rounded-baha-lg sm:aspect-[16/10] lg:aspect-[4/3]" />
          <Skeleton className="aspect-[3/2] w-full rounded-baha-lg lg:aspect-auto lg:min-h-[18rem]" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-baha-lg" />
            <Skeleton className="h-28 w-full rounded-baha-lg" />
          </div>
          <Skeleton className="h-52 w-full rounded-baha-lg" />
        </div>

        <Skeleton className="mt-8 h-48 w-full rounded-baha-lg" />
      </main>
    </div>
  )
}
