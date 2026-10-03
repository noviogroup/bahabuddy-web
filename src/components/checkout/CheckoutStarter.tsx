'use client'

import { useState } from 'react'
import CheckoutForm from '@/components/checkout/CheckoutForm'
import { getStripe } from '@/lib/stripe/client'

/**
 * Creates the PaymentIntent only when the traveller asks to pay, so page
 * loads, refreshes, and link prefetches never create Stripe intents or
 * pending booking rows.
 */
export default function CheckoutStarter({
  tripId,
  tripName,
  amountCents,
  returnUrl,
}: {
  tripId: string
  tripName: string
  amountCents: number
  returnUrl: string
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/booking/payments/checkout-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      })
      const data = await res.json().catch(() => ({})) as { clientSecret?: string; error?: string }
      if (!res.ok || !data.clientSecret) throw new Error(data.error ?? 'We could not start the payment. Please try again.')
      setClientSecret(data.clientSecret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not start the payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (clientSecret) {
    return (
      <CheckoutForm
        stripePromise={getStripe()}
        clientSecret={clientSecret}
        amountCents={amountCents}
        currency="usd"
        tripName={tripName}
        returnUrl={returnUrl}
      />
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-baha-md bg-coral-50 border border-coral-200 px-4 py-3 text-sm text-coral-700">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-full transition-colors shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
      >
        {loading ? 'Preparing secure payment…' : 'Continue to payment'}
      </button>
    </div>
  )
}
