import { NextResponse } from 'next/server'
import { requireActiveVendorAccess } from '@/lib/vendor-portal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const access = await requireActiveVendorAccess()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.message, code: access.code },
      { status: access.status },
    )
  }

  return NextResponse.json(
    {
      user: {
        id: access.user.id,
        email: access.user.email,
      },
      membership: access.membership,
      memberships: access.memberships,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
