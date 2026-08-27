import { redirect } from 'next/navigation'
import { VendorPhotoSubmissionForm } from '@/components/vendor/VendorForms'
import { fetchVendorListings, requireActiveVendorAccess } from '@/lib/vendor-portal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function VendorMediaPage({
  searchParams,
}: {
  searchParams?: { partner_id?: string }
}) {
  const access = await requireActiveVendorAccess(searchParams?.partner_id)
  if (!access.ok) redirect('/vendor')
  const listings = await fetchVendorListings([access.membership.partner_id])

  return (
    <div className="max-w-4xl">
      <VendorPhotoSubmissionForm partnerId={access.membership.partner_id} listings={listings} />
    </div>
  )
}
