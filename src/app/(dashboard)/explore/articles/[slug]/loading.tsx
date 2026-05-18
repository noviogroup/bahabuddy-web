import Skeleton from '@/components/ui/Skeleton'

/**
 * /explore/articles/[slug] loading state.
 *
 * Mirrors the article reader layout — back link, hero, header, three
 * intro paragraphs, two body sections — so the page doesn't jump when
 * the article resolves. Since articles are statically generated, this
 * loading state will rarely show in production; it's here for the
 * dev-server experience and SSR cold starts.
 */
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Skeleton className="h-5 w-32 mb-6" />

      <Skeleton className="aspect-[16/9] w-full rounded-baha-lg mb-6" />

      <Skeleton className="h-9 w-5/6 mb-3" />
      <Skeleton className="h-9 w-3/5 mb-5" />
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-5 w-4/5 mb-8" />

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
  )
}
