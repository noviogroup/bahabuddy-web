import { createClient } from '@/lib/supabase/server'
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
    .maybeSingle()

  if (existing?.short_code) {
    return NextResponse.json({ code: existing.short_code, isNew: false })
  }

  // Create new collaborative invite code (expires in 30 days)
  const code = `inv-${Math.random().toString(36).slice(2, 9)}`
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

  if (error || !created) return NextResponse.json({ error: error?.message ?? 'Failed to create invite' }, { status: 500 })

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

  const { error } = await supabase
    .from('share_links')
    .delete()
    .eq('trip_id', tripId)
    .eq('share_type', 'collaborative')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
