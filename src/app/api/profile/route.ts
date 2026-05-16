import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface UserProfile {
  display_name: string
  email: string | null
  avatar_url: string | null
  party_type: string
  party_size: number
  city: string | null
  country: string | null
  interest_tags: string[] | null
  dietary_needs: string[] | null
  accessibility_needs: string[] | null
}

const ALLOWED_UPDATE_FIELDS = [
  'display_name',
  'avatar_url',
  'party_type',
  'party_size',
  'city',
  'country',
  'interest_tags',
  'dietary_needs',
  'accessibility_needs',
] as const

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('users')
    .select('display_name, email, avatar_url, party_type, party_size, city, country, interest_tags, dietary_needs, accessibility_needs')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Profile not found' }, { status: 500 })
  }

  const profile = data as UserProfile
  return NextResponse.json({
    profile: { ...profile, email: profile.email ?? user.email },
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { error } = await supabase.from('users').update(updates).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
