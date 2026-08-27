import { redirect } from 'next/navigation'
import { VendorOverview } from '@/components/vendor/VendorDashboard'
import { fetchVendorDashboardData } from '@/lib/vendor-portal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function VendorDashboardPage({
  searchParams,
}: {
  searchParams?: { partner_id?: string }
}) {
  const data = await fetchVendorDashboardData(searchParams?.partner_id)
  if (!data) redirect('/vendor')
  return <VendorOverview data={data} />
}
