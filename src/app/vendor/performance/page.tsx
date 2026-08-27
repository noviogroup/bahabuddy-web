import { redirect } from 'next/navigation'
import { VendorPerformanceView } from '@/components/vendor/VendorDashboard'
import { fetchVendorPerformance, requireActiveVendorAccess } from '@/lib/vendor-portal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function VendorPerformancePage({
  searchParams,
}: {
  searchParams?: { partner_id?: string }
}) {
  const access = await requireActiveVendorAccess(searchParams?.partner_id)
  if (!access.ok) redirect('/vendor')
  const performance = await fetchVendorPerformance(access.membership.partner_id)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold leading-8 text-night">Performance</h2>
        <p className="mt-1 text-sm leading-6 text-charcoal">Basic partner performance and pending review counts.</p>
      </div>
      <VendorPerformanceView performance={performance} />
    </div>
  )
}
