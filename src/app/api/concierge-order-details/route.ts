import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminOrderLabel, getAdminEmailList, sendTransactionalEmail } from '@/lib/transactional-email'

export const dynamic = 'force-dynamic'

async function notifyAdmins(orderId: string) {
  const recipients = getAdminEmailList()
  if (recipients.length === 0) return

  await sendTransactionalEmail({
    to: recipients,
    subject: `Concierge trip details submitted — ${adminOrderLabel(orderId)}`,
    html: `<p>A customer submitted Concierge trip details.</p><p>Order: <strong>${adminOrderLabel(orderId)}</strong></p><p>Open the admin Concierge Orders queue to review.</p>`,
    text: `Concierge trip details submitted for ${adminOrderLabel(orderId)}. Open the admin Concierge Orders queue to review.`,
  })
}

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
  if (body.mark_details_submitted === true) notifyAdmins(orderId).catch(console.error)
  return NextResponse.json({ success: true, order: data })
}
