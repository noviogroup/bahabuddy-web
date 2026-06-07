import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const body = await request.json()
  const orderId = typeof body.order_id === 'string' ? body.order_id : ''
  if (!orderId) return NextResponse.json({ error: 'Order id is required.' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of ['traveler_name', 'traveler_email', 'travel_dates', 'party_size', 'budget_range', 'destination_interests', 'notes']) {
    if (typeof body[field] === 'string') updates[field] = body[field].trim() || null
  }
  if (body.mark_details_submitted === true) updates.status = 'in_review'

  const { data, error } = await supabase
    .from('concierge_orders')
    .update(updates)
    .eq('id', orderId)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, order: data })
}
