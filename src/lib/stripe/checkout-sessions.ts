/**
 * Server-only lookup of a Stripe Checkout Session, used by success pages so
 * they never claim a payment succeeded just because a session_id is in the URL.
 */
export type CheckoutSessionPaymentState = 'paid' | 'processing' | 'unpaid' | 'unknown'

export async function getCheckoutSessionPaymentState(sessionId: string | undefined | null): Promise<CheckoutSessionPaymentState> {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? ''
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId) || !secretKey) return 'unknown'

  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: 'no-store',
    })
    if (!response.ok) return 'unknown'
    const session = await response.json() as { payment_status?: string; status?: string }
    if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') return 'paid'
    if (session.status === 'complete') return 'processing'
    return 'unpaid'
  } catch (error) {
    console.error('[stripe] checkout session lookup failed', error)
    return 'unknown'
  }
}
