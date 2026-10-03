import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminOrderLabel, getAdminEmailList, sendTransactionalEmail } from '@/lib/transactional-email'

export const dynamic = 'force-dynamic'

const CUSTOMER_WRITABLE_FIELDS = [
  'traveler_name',
  'traveler_email',
  'travel_dates',
  'party_size',
  'budget_range',
  'destination_interests',
  'notes',
] as const
const MAX_FIELD_LENGTH = 4000
const ORDER_RESPONSE_COLUMNS = 'id, status, payment_status, traveler_name, traveler_email, travel_dates, party_size, budget_range, destination_interests, notes, updated_at'

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

  const { data: current, error: lookupError } = await supabase
    .from('concierge_orders')
    .select('id, status, payment_status')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (lookupError) {
    console.error('[concierge-order-details] lookup failed', lookupError.message)
    return NextResponse.json({ error: 'Could not save trip details.' }, { status: 500 })
  }
  if (!current) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  // Customers may only edit trip-detail fields. Status, payment, price, and
  // Stripe columns are owned by the webhook and the admin console.
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of CUSTOMER_WRITABLE_FIELDS) {
    if (typeof body[field] === 'string') updates[field] = body[field].trim().slice(0, MAX_FIELD_LENGTH) || null
  }

  const wantsReview = body.mark_details_submitted === true
  const isPaid = current.payment_status === 'paid'
  // Only a paid order that has not progressed further moves into review.
  const moveToReview = wantsReview && isPaid && current.status === 'paid'
  if (moveToReview) updates.status = 'in_review'

  let query = supabase
    .from('concierge_orders')
    .update(updates)
    .eq('id', orderId)
    .eq('user_id', user.id)
  if (moveToReview) query = query.eq('payment_status', 'paid')
  const { data, error } = await query
    .select(ORDER_RESPONSE_COLUMNS)
    .single()

  if (error) {
    console.error('[concierge-order-details] update failed', error.message)
    return NextResponse.json({ error: 'Could not save trip details.' }, { status: 500 })
  }
  if (moveToReview) notifyAdmins(orderId).catch(console.error)
  return NextResponse.json({
    success: true,
    order: data,
    inReview: moveToReview || current.status === 'in_review',
    awaitingPayment: wantsReview && !isPaid,
  })
}
