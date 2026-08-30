import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanText, cleanUrl, requireActiveVendorAccess } from '@/lib/vendor-portal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PROFILE_FIELDS = [
  'name',
  'contact_name',
  'contact_email',
  'contact_phone',
  'website',
  'island_name',
  'description',
] as const

function buildProfileProposal(body: Record<string, unknown>): Record<string, string | null> {
  const proposed: Record<string, string | null> = {}
  for (const field of PROFILE_FIELDS) {
    if (!(field in body)) continue
    if (field === 'website') {
      const value = body[field]
      if (value && !cleanUrl(value)) {
        throw new Error('Website must be a valid http or https URL.')
      }
      proposed[field] = cleanUrl(value)
    } else {
      proposed[field] = cleanText(body[field], field === 'description' ? 1200 : 200)
    }
  }
  return proposed
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const requestedPartnerId = typeof body.partner_id === 'string' ? body.partner_id : null
  const access = await requireActiveVendorAccess(requestedPartnerId)

  if (!access.ok) {
    return NextResponse.json(
      { error: access.message, code: access.code },
      { status: access.status },
    )
  }

  let proposedData: Record<string, string | null>
  try {
    proposedData = buildProfileProposal(body)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }

  if (Object.keys(proposedData).length === 0) {
    return NextResponse.json({ error: 'At least one profile field is required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Vendor portal service unavailable' }, { status: 503 })

  const note = cleanText(body.note, 800)
  const { data, error } = await admin
    .from('partner_profile_submissions')
    .insert({
      partner_id: access.membership.partner_id,
      submitted_by: access.user.id,
      submitted_by_email: access.user.email ?? null,
      proposed_data: proposedData,
      note,
      status: 'pending',
    } as never)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ submission: data }, { status: 201 })
}
