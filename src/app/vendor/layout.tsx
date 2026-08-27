import { redirect } from 'next/navigation'
import { chooseVendorMembership, getVendorPortalState } from '@/lib/vendor-portal'
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

  const membership = chooseVendorMembership(state.memberships)
  if (!membership) {
    return <VendorAccessPending state={state} />
  }

  return (
    <VendorPortalShell membership={membership} memberships={state.activeMemberships}>
      {children}
    </VendorPortalShell>
  )
}
