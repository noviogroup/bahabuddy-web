import { redirect } from 'next/navigation'
import { VendorDealSubmissionForm } from '@/components/vendor/VendorForms'
import { fetchVendorListings, requireActiveVendorAccess } from '@/lib/vendor-portal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function VendorDealsPage({
  searchParams,
}: {
  searchParams?: { partner_id?: string }
}) {
  const access = await requireActiveVendorAccess(searchParams?.partner_id)
  if (!access.ok) redirect('/vendor')
  const listings = await fetchVendorListings([access.membership.partner_id])

  return (
    <div className="max-w-4xl">
      <VendorDealSubmissionForm partnerId={access.membership.partner_id} listings={listings} />
    </div>
  )
}
