import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const RATINGS = new Set(['helpful', 'not_helpful'])
const CATEGORIES = new Set(['incorrect_island', 'outdated_information', 'weak_recommendation', 'missing_place', 'unsafe_or_unclear', 'other'])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to rate this response.' }, { status: 401 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Feedback is unavailable.' }, { status: 503 })

  const body = await request.json() as Record<string, unknown>
  const messageId = typeof body.message_id === 'string' ? body.message_id : ''
  const rating = typeof body.rating === 'string' ? body.rating : ''
  const issueCategory = typeof body.issue_category === 'string' ? body.issue_category : null
  if (!messageId || !RATINGS.has(rating)) return NextResponse.json({ error: 'Invalid feedback.' }, { status: 400 })
  if (issueCategory && !CATEGORIES.has(issueCategory)) return NextResponse.json({ error: 'Invalid issue category.' }, { status: 400 })

  const { data: message } = await admin
    .from('chat_messages')
    .select('id,role,chat_threads!inner(user_id)')
    .eq('id', messageId)
    .eq('role', 'assistant')
    .eq('chat_threads.user_id', user.id)
    .maybeSingle()
  if (!message) return NextResponse.json({ error: 'Response not found.' }, { status: 404 })

  const { error } = await admin.from('chat_message_feedback').upsert({
    chat_message_id: messageId,
    user_id: user.id,
    channel: 'web',
    rating,
    issue_category: issueCategory,
  }, { onConflict: 'chat_message_id,user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
