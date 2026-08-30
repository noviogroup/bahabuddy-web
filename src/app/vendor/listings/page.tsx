import { redirect } from 'next/navigation'
import { VendorLinkedListingsTable } from '@/components/vendor/VendorDashboard'
import { fetchVendorListings, requireActiveVendorAccess, vendorPartnerIds } from '@/lib/vendor-portal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function VendorListingsPage({
  searchParams,
}: {
  searchParams?: { partner_id?: string }
}) {
  const access = await requireActiveVendorAccess(searchParams?.partner_id)
  if (!access.ok) redirect('/vendor')

  const partnerIds = searchParams?.partner_id ? [access.membership.partner_id] : vendorPartnerIds(access.memberships)
  const listings = await fetchVendorListings(partnerIds)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold leading-8 text-night">Linked listings</h2>
        <p className="mt-1 text-sm leading-6 text-charcoal">Canonical places connected to your approved partner record.</p>
      </div>
      <VendorLinkedListingsTable listings={listings} />
    </div>
  )
}
