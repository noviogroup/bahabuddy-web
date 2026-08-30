import { NextResponse } from 'next/server'
import { fetchVendorListings, requireActiveVendorAccess, vendorPartnerIds } from '@/lib/vendor-portal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedPartnerId = searchParams.get('partner_id')
  const access = await requireActiveVendorAccess(requestedPartnerId)

  if (!access.ok) {
    return NextResponse.json(
      { error: access.message, code: access.code },
      { status: access.status },
    )
  }

  const partnerIds = requestedPartnerId ? [access.membership.partner_id] : vendorPartnerIds(access.memberships)
  const listings = await fetchVendorListings(partnerIds)

  return NextResponse.json(
    { listings },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
