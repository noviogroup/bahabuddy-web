import Skeleton from '@/components/ui/Skeleton'

/**
 * /explore/articles/[slug] loading state.
 *
 * Mirrors the compact article reader layout: title/actions first,
 * supporting media second, then the article body.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <Skeleton className="mb-3 h-4 w-52" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Skeleton className="mb-2 h-3 w-28" />
              <Skeleton className="mb-3 h-10 w-full max-w-2xl" />
              <Skeleton className="h-5 w-full max-w-xl" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-40 rounded-full" />
              <Skeleton className="h-10 w-28 rounded-full" />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="mb-8 aspect-[16/7] min-h-[220px] w-full rounded-baha-xl" />

        <div className="mx-auto max-w-3xl">
          <div className="space-y-3 mb-10">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {[0, 1].map(i => (
            <section key={i} className="mb-8">
              <Skeleton className="h-7 w-1/2 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
