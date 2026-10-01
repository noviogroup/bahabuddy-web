import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateShareCode } from '@/lib/share-codes'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/trips/invite — generate a collaborative invite link for a trip
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tripId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const tripId = body.tripId
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 })

  // Verify ownership
  const { data: trip } = await supabase.from('trips').select('id, name, user_id').eq('id', tripId).single()
  if (!trip || trip.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check for existing non-expired collaborative link
  const now = new Date().toISOString()
  const { data: existing } = await supabase
    .from('share_links')
    .select('short_code, expires_at')
    .eq('trip_id', tripId)
    .eq('share_type', 'collaborative')
    .gt('expires_at', now)
    .order('expires_at', { ascending: false })
    .limit(1)

  const existingCode = existing?.[0]?.short_code
  if (existingCode) {
    return NextResponse.json({ code: existingCode, isNew: false })
  }

  // Create new collaborative invite code (expires in 30 days)
  const code = `inv-${generateShareCode()}`
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: created, error } = await supabase
    .from('share_links')
    .insert({
      trip_id: tripId,
      created_by: user.id,
      share_type: 'collaborative',
      short_code: code,
      expires_at: expiresAt,
    })
    .select('short_code')
    .single()

  if (error || !created) {
    if (error) console.error('[POST /api/trips/invite]', error)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  return NextResponse.json({ code: created.short_code, isNew: true })
}

// DELETE /api/trips/invite?tripId=xxx — revoke all invite links for a trip
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tripId = req.nextUrl.searchParams.get('tripId')
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 })

  const { data: trip } = await supabase.from('trips').select('user_id').eq('id', tripId).single()
  if (!trip || trip.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // share_links has no DELETE RLS policy, so a user-scoped delete silently
  // matches 0 rows. Ownership was verified above; run the revoke with the
  // service role and report honestly how many links were actually removed.
  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Invite revocation is temporarily unavailable.' }, { status: 503 })
  }

  const { data: deleted, error } = await admin
    .from('share_links')
    .delete()
    .eq('trip_id', tripId)
    .eq('share_type', 'collaborative')
    .select('id')

  if (error) {
    console.error('[DELETE /api/trips/invite]', error)
    return NextResponse.json({ error: 'Failed to revoke invite links.' }, { status: 500 })
  }
  const revoked = deleted?.length ?? 0
  if (revoked === 0) {
    return NextResponse.json({ error: 'No active invite link to revoke.', revoked: 0 }, { status: 404 })
  }
  return NextResponse.json({ success: true, revoked })
}
