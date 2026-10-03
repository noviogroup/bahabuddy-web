import { redirect } from 'next/navigation'
import { getPreferredVendorPartnerId, getVendorPortalState, resolveVendorMembership } from '@/lib/vendor-portal'
import { VendorAccessPending, VendorPortalShell, VendorServiceUnavailable } from '@/components/vendor/VendorPortalShell'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const state = await getVendorPortalState()

  if (state.kind === 'unauthenticated') {
    redirect('/login?redirect=/vendor')
  }

  if (state.kind === 'service_unavailable') {
    return <VendorServiceUnavailable />
  }

  // Same partner as the page: middleware stores ?partner_id= in a cookie the
  // layout can read (layouts never receive searchParams).
  const membership = resolveVendorMembership(state.memberships, null, getPreferredVendorPartnerId())
  if (!membership) {
    return <VendorAccessPending state={state} />
  }

  return (
    <VendorPortalShell membership={membership} memberships={state.activeMemberships}>
      {children}
    </VendorPortalShell>
  )
}
