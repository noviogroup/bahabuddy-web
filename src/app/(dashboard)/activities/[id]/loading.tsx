import Skeleton from '@/components/ui/Skeleton'

/**
 * /activities/[id] loading state.
 *
 * Mirrors the activity detail page layout — back link, hero, header with
 * rating chip, metadata pills (type + kid-friendly + address),
 * description block, vibe tag chips — so the page doesn't jump when the
 * data arrives.
 */
export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Skeleton className="h-5 w-32 mb-6" />

      <Skeleton className="aspect-[16/9] sm:aspect-[2/1] w-full rounded-baha-lg mb-6" />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="flex-1 min-w-0">
          <Skeleton className="h-9 w-3/4 mb-2" />
          <Skeleton className="h-5 w-1/3" />
        </div>
        <Skeleton className="h-16 w-20 rounded-xl" />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <Skeleton className="h-7 w-24" rounded="full" />
        <Skeleton className="h-7 w-28" rounded="full" />
        <Skeleton className="h-7 w-48" rounded="full" />
      </div>

      <Skeleton className="h-6 w-48 mb-3" />
      <div className="space-y-2 mb-8">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <Skeleton className="h-6 w-24 mb-3" />
      <div className="flex flex-wrap gap-2 mb-10">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" rounded="full" />
        ))}
      </div>

      <Skeleton className="h-48 w-full rounded-baha-lg" />
    </div>
  )
}
