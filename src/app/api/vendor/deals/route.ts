import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  cleanIsoDate,
  cleanNumber,
  cleanText,
  cleanUrl,
  ensurePartnerPlaceLink,
  requireActiveVendorAccess,
} from '@/lib/vendor-portal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const VALID_DEAL_TYPES = new Set([
  'partner_offer',
  'featured_place',
  'sponsored_content',
  'concierge_upsell',
  'tour_promotion',
])

function buildDealProposal(body: Record<string, unknown>): Record<string, unknown> | { error: string } {
  const title = cleanText(body.title, 160)
  if (!title) return { error: 'Deal title is required.' }

  const dealType = cleanText(body.deal_type, 80) ?? 'partner_offer'
  if (!VALID_DEAL_TYPES.has(dealType)) return { error: 'Invalid deal type.' }

  const image = body.image ? cleanUrl(body.image) : null
  if (body.image && !image) return { error: 'Image URL must be a valid http or https URL.' }

  const ctaUrl = body.cta_url ? cleanUrl(body.cta_url) : null
  if (body.cta_url && !ctaUrl) return { error: 'CTA URL must be a valid http or https URL.' }

  return {
    title,
    deal_type: dealType,
    description: cleanText(body.description, 1200),
    image,
    price_from: cleanNumber(body.price_from),
    cta_label: cleanText(body.cta_label, 80),
    cta_url: ctaUrl,
    source: 'vendor_portal',
    starts_at: cleanIsoDate(body.starts_at),
    ends_at: cleanIsoDate(body.ends_at),
    place_id: cleanText(body.place_id, 80),
  }
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

  const proposedData = buildDealProposal(body)
  if ('error' in proposedData) {
    return NextResponse.json({ error: proposedData.error }, { status: 400 })
  }

  if (proposedData.place_id) {
    const ownsPlace = await ensurePartnerPlaceLink(access.membership.partner_id, String(proposedData.place_id))
    if (!ownsPlace) return NextResponse.json({ error: 'Place is not linked to this partner.' }, { status: 403 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Vendor portal service unavailable' }, { status: 503 })

  const { data, error } = await admin
    .from('partner_deal_submissions')
    .insert({
      partner_id: access.membership.partner_id,
      submitted_by: access.user.id,
      submitted_by_email: access.user.email ?? null,
      proposed_data: proposedData,
      note: cleanText(body.note, 800),
      status: 'pending',
    } as never)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ submission: data }, { status: 201 })
}
