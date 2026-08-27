import { redirect } from 'next/navigation'
import { VendorProfileSubmissionForm } from '@/components/vendor/VendorForms'
import { requireActiveVendorAccess } from '@/lib/vendor-portal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function VendorProfilePage({
  searchParams,
}: {
  searchParams?: { partner_id?: string }
}) {
  const access = await requireActiveVendorAccess(searchParams?.partner_id)
  if (!access.ok || !access.membership.partner) redirect('/vendor')

  return (
    <div className="max-w-4xl">
      <VendorProfileSubmissionForm partner={access.membership.partner} />
    </div>
  )
}
