/**
 * Stripe client loader (C.9).
 *
 * Loads Stripe.js lazily, once, and returns the same promise on
 * subsequent calls — required by @stripe/react-stripe-js's <Elements>
 * provider. The promise resolves to null when Stripe isn't configured
 * (no NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY), letting callers render a
 * graceful fallback instead of crashing.
 *
 * Companion to the existing mobile flow in payment_service.dart:
 *   - mobile uses flutter_stripe's PaymentSheet
 *   - web uses Stripe.js's PaymentElement
 *   - both hit the same `stripe-payment` Edge Function on Supabase
 *   - both rely on the same `stripe-webhook` for status updates
 */

import { loadStripe, type Stripe } from '@stripe/stripe-js'

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''

export const isStripeConfigured: boolean = publishableKey.trim().length > 0

let stripePromise: Promise<Stripe | null> | null = null

/**
 * Returns the singleton Stripe.js instance. Returns a promise that
 * resolves to null when Stripe isn't configured — callers must handle
 * that branch.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!isStripeConfigured) return Promise.resolve(null)
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

export const stripePublishableKey = publishableKey
