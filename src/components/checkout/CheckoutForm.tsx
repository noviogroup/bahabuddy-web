'use client'

/**
 * CheckoutForm — wraps Stripe's <PaymentElement> with our brand styling.
 *
 * Receives a clientSecret from the server (created via the stripe-payment
 * Edge Function). Renders the unified PaymentElement which handles
 * cards, Apple Pay, Google Pay, Link, and other methods automatically.
 *
 * On submit:
 *   - calls stripe.confirmPayment() with a return_url
 *   - Stripe processes the charge
 *   - the server-side stripe-webhook updates the booking status (already
 *     deployed — we reuse mobile's webhook unchanged)
 *   - Stripe redirects to /dashboard/checkout/success?payment_intent=...
 *
 * Errors are caught and shown inline; the user can retry without leaving
 * the page.
 */

import { useState } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { type Appearance, type Stripe } from '@stripe/stripe-js'

interface CheckoutFormProps {
  /** Singleton Stripe.js instance from getStripe(). */
  stripePromise: Promise<Stripe | null>
  /** PaymentIntent client secret from the Edge Function. */
  clientSecret: string
  /** Display amount in cents, e.g. 22000 → "$220.00". */
  amountCents: number
  /** Currency code, default 'usd'. */
  currency?: string
  /** Trip name for the receipt header. */
  tripName: string
  /** Where Stripe redirects after payment. Pre-built absolute URL. */
  returnUrl: string
}

const STRIPE_APPEARANCE: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#156FD1',
    colorBackground: '#ffffff',
    colorText: '#0B2545',
    colorDanger: '#FF7A59',
    fontFamily: 'Figtree, system-ui, -apple-system, sans-serif',
    spacingUnit: '4px',
    borderRadius: '12px',
  },
  rules: {
    '.Input': {
      border: '1px solid #E5E7EB',
      boxShadow: 'none',
    },
    '.Input:focus': {
      border: '1px solid #156FD1',
      boxShadow: '0 0 0 2px rgba(21, 111, 209, 0.2)',
    },
  },
}

export default function CheckoutForm({
  stripePromise,
  clientSecret,
  amountCents,
  currency = 'usd',
  tripName,
  returnUrl,
}: CheckoutFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: STRIPE_APPEARANCE,
        loader: 'auto',
      }}
    >
      <InnerForm
        amountCents={amountCents}
        currency={currency}
        tripName={tripName}
        returnUrl={returnUrl}
      />
    </Elements>
  )
}

function InnerForm({
  amountCents,
  currency,
  tripName,
  returnUrl,
}: {
  amountCents: number
  currency: string
  tripName: string
  returnUrl: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amountCents / 100)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsProcessing(true)
    setError(null)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    })

    // confirmPayment only returns here on immediate validation errors —
    // on success the page redirects to return_url.
    if (stripeError) {
      setError(
        stripeError.message
          ?? 'Payment could not be processed. Please check your details and try again.',
      )
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-baha-md border border-gray-200 bg-white p-5 shadow-soft">
        <PaymentElement
          options={{
            layout: 'tabs',
            // Default to the user's billing email if Stripe knows it
            defaultValues: { billingDetails: {} },
          }}
        />
      </div>

      {error && (
        <div className="rounded-baha-md bg-coral-50 border border-coral-200 px-4 py-3 text-sm text-coral-700">
          <p className="font-semibold mb-0.5">Payment didn&apos;t go through</p>
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-full transition-colors shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
      >
        {isProcessing ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
            </svg>
            Processing…
          </>
        ) : (
          <>
            Pay {formattedAmount}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        Secured by Stripe. {tripName} — {formattedAmount} {currency.toUpperCase()}.
      </p>
    </form>
  )
}
