import { Skeleton } from '@/components/ui'

/** Loading skeleton for `/profile` — account card + 3 form sections. */
export default function ProfileLoading() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Account card */}
      <section className="mb-8 bg-white rounded-baha-md border border-gray-200 p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12" rounded="full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </section>

      {/* Form sections (3) */}
      {Array.from({ length: 3 }).map((_, i) => (
        <section key={i} className="mb-8">
          <Skeleton className="h-6 w-44 mb-2" />
          <Skeleton className="h-4 w-72 mb-4" />
          <div className="bg-white rounded-baha-md border border-gray-200 p-5 shadow-soft space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </section>
      ))}
    </main>
  )
}
