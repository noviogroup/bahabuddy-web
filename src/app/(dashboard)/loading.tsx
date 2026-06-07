import { PageLoading } from '@/components/ui'

/**
 * Default loading state for authenticated routes without a more
 * specific loading.tsx. Sidebar and chat shell stay visible via layout.
 */
export default function DashboardLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <PageLoading minHeight="min-h-[40vh]" />
    </main>
  )
}
