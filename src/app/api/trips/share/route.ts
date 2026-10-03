import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateShareCode, PUBLIC_SHARE_TTL_MS } from '@/lib/share-codes'

/**
 * POST /api/trips/share — return (or create) the public read-only share
 * link for a trip the caller owns.
 *
 * Replaces the old client-side insert in <ShareButton>, which used
 * Math.random() codes, ignored insert errors and copied a link even when no
 * row existed. Codes are CSPRNG-generated and new public links expire.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to share this trip.' }, { status: 401 })

  let body: { tripId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const tripId = typeof body.tripId === 'string' ? body.tripId : null
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 })

  const { data: trip } = await supabase
    .from('trips')
    .select('id, user_id')
    .eq('id', tripId)
    .maybeSingle()
  if (!trip || trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const { data: existing, error: lookupError } = await supabase
    .from('share_links')
    .select('short_code, expires_at')
    .eq('trip_id', tripId)
    .eq('share_type', 'link')
    .gt('expires_at', now)
    .order('expires_at', { ascending: false })
    .limit(1)

  if (lookupError) {
    console.error('[POST /api/trips/share] lookup', lookupError)
    return NextResponse.json({ error: 'Could not create a share link.' }, { status: 500 })
  }

  const existingCode = existing?.[0]?.short_code
  if (existingCode) {
    return NextResponse.json({ code: existingCode, expiresAt: existing?.[0]?.expires_at ?? null, isNew: false })
  }

  const expiresAt = new Date(Date.now() + PUBLIC_SHARE_TTL_MS).toISOString()
  const { data: created, error } = await supabase
    .from('share_links')
    .insert({
      trip_id: tripId,
      created_by: user.id,
      share_type: 'link',
      short_code: generateShareCode(),
      expires_at: expiresAt,
    })
    .select('short_code, expires_at')
    .single()

  if (error || !created?.short_code) {
    if (error) console.error('[POST /api/trips/share] insert', error)
    return NextResponse.json({ error: 'Could not create a share link.' }, { status: 500 })
  }

  return NextResponse.json({ code: created.short_code, expiresAt: created.expires_at ?? expiresAt, isNew: true })
}
