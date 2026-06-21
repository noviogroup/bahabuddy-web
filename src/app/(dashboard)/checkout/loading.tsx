import { Skeleton } from '@/components/ui'

/**
 * Loading skeleton for /dashboard/checkout.
 * Most important loading state in the app — the user is mid-funnel and
 * a blank screen here would feel like a payment failure.
 */
export default function CheckoutLoading() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-32" />

      {/* Order summary card */}
      <div className="rounded-baha-lg border border-gray-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-3 w-20 mb-3" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex justify-between items-end mt-6 pt-4 border-t border-gray-200">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Payment form */}
      <div className="rounded-baha-md border border-gray-200 bg-white p-5 shadow-soft space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>

      {/* Submit button */}
      <Skeleton className="h-14 w-full" rounded="full" />
    </main>
  )
}
