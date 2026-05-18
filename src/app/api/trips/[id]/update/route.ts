/**
 * PATCH /api/trips/[id]/update — chip-driven trip edits.
 *
 * Used by <TripContextChips> to persist updates from the four chip
 * editors (Island, Dates, Who, Budget) without going through chat.
 *
 * Security:
 *   - Auth: required (Supabase session cookie via createClient).
 *   - Ownership: explicit `user_id = auth.uid()` check; row not
 *     found OR not owned → 404. We don't differentiate the two
 *     deliberately so we don't leak trip existence.
 *   - Column allowlist: only the chip-editable columns can be
 *     written. Anything else in the body is dropped silently.
 *
 * Returns 200 + the updated trip row, or an error payload.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface TripUpdatePayload {
  islands?: string[]
  date_start?: string | null
  date_end?: string | null
  party_type?: string
  party_size?: number
  budget_estimate?: number | null
  hero_image_url?: string | null
}

// Allowlist of fields that the chip strip can update. Any other key
// in the request body is dropped.
const ALLOWED_FIELDS = new Set<keyof TripUpdatePayload>([
  'islands',
  'date_start',
  'date_end',
  'party_type',
  'party_size',
  'budget_estimate',
  'hero_image_url',
])

const ALLOWED_PARTY_TYPES = new Set(['solo', 'couple', 'family', 'friends', 'group'])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 })
  }

  // Build a sanitized payload from the allowlist.
  const payload: Record<string, unknown> = {}
  const raw = body as Record<string, unknown>
  for (const key of Object.keys(raw)) {
    if (ALLOWED_FIELDS.has(key as keyof TripUpdatePayload)) {
      payload[key] = raw[key]
    }
  }

  // Field-level validation
  if ('islands' in payload) {
    if (!Array.isArray(payload.islands) || payload.islands.some(v => typeof v !== 'string')) {
      return NextResponse.json({ error: 'islands must be string[]' }, { status: 400 })
    }
  }
  if ('party_type' in payload && typeof payload.party_type === 'string') {
    if (!ALLOWED_PARTY_TYPES.has(payload.party_type)) {
      return NextResponse.json({ error: 'Invalid party_type' }, { status: 400 })
    }
  }
  if ('party_size' in payload && typeof payload.party_size !== 'number') {
    return NextResponse.json({ error: 'party_size must be a number' }, { status: 400 })
  }
  if ('party_size' in payload && typeof payload.party_size === 'number' && payload.party_size < 1) {
    return NextResponse.json({ error: 'party_size must be >= 1' }, { status: 400 })
  }
  if ('budget_estimate' in payload && payload.budget_estimate !== null && typeof payload.budget_estimate !== 'number') {
    return NextResponse.json({ error: 'budget_estimate must be a number or null' }, { status: 400 })
  }
  if ('date_start' in payload && payload.date_start !== null && typeof payload.date_start !== 'string') {
    return NextResponse.json({ error: 'date_start must be a date string or null' }, { status: 400 })
  }
  if ('date_end' in payload && payload.date_end !== null && typeof payload.date_end !== 'string') {
    return NextResponse.json({ error: 'date_end must be a date string or null' }, { status: 400 })
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // Update with explicit ownership check — Postgres RLS should also
  // enforce this, but the extra eq() guards us against any RLS regressions.
  const { data, error } = await supabase
    .from('trips')
    .update(payload)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[PATCH /api/trips/:id/update]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }

  return NextResponse.json({ trip: data })
}
