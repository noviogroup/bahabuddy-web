'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import CheckoutForm from '@/components/checkout/CheckoutForm'
import { createClient } from '@/lib/supabase/client'
import {
  checkoutErrorMessage,
  classifyCheckoutError,
  getActiveTourEntitlement,
  resolveTourCta,
  tourLoginHref,
  tourOwnershipLabel,
  tourPriceLabel,
} from '@/lib/self-guided-tours'
import { getStripeForPublishableKey } from '@/lib/stripe/client'

export interface TourGetCtaProps {
  tourId: string
  title: string
  priceCents: number
  currency: string
}

interface CheckoutSession {
  clientSecret: string
  publishableKey: string | null
  amountCents: number
  currency: string
}

const PRIMARY_BUTTON =
  'inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:w-auto'
const SECONDARY_BUTTON =
  'inline-flex min-h-11 w-full items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-night transition-colors hover:border-brand-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:w-auto'

/**
 * "Get this tour" call to action.
 *
 *   signed out      → sign in / create account (returns to this tour)
 *   guest session   → create an account (entitlements must be portable)
 *   owned           → Purchased / In My tours + My tours / app instructions
 *   free            → Add to my tours (rpc claim_free_self_tour)
 *   priced          → Stripe PaymentElement via stripe-payment (self_tour)
 */
export default function TourGetCta({ tourId, title, priceCents, currency }: TourGetCtaProps) {
  const supabase = useMemo(() => createClient(), [])
  const [authLoading, setAuthLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [owned, setOwned] = useState<boolean | null>(null)
  /** Entitlement source ('stripe' | 'free' | …) for the ownership badge. */
  const [ownedSource, setOwnedSource] = useState<string | null>(null)
  const [effectivePrice, setEffectivePrice] = useState(priceCents)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null)
  const [returnUrl, setReturnUrl] = useState('')

  const refreshOwnership = useCallback(async () => {
    try {
      const entitlement = await getActiveTourEntitlement(supabase, tourId)
      setOwnedSource(entitlement?.source ?? null)
      setOwned(entitlement !== null)
    } catch {
      // Unknown ownership should not block the CTA; the server re-checks.
      setOwned(false)
    }
  }, [supabase, tourId])

  useEffect(() => {
    let active = true
    setReturnUrl(`${window.location.origin}/tours/${tourId}/success`)
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return
      const user = data.user
      setSignedIn(Boolean(user))
      setIsAnonymous(Boolean((user as { is_anonymous?: boolean } | null)?.is_anonymous))
      setAuthLoading(false)
      if (user) await refreshOwnership()
    }).catch(() => {
      if (!active) return
      setAuthLoading(false)
    })
    return () => {
      active = false
    }
  }, [supabase, tourId, refreshOwnership])

  const state = resolveTourCta({ authLoading, signedIn, isAnonymous, owned, priceCents: effectivePrice })
  const priceLabel = tourPriceLabel(effectivePrice, currency)

  async function claimFree() {
    setBusy(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('claim_free_self_tour', { p_tour_id: tourId })
    setBusy(false)
    if (rpcError) {
      if (/require checkout/i.test(rpcError.message)) {
        setError('This tour now has a price. Refresh the page to see it.')
      } else {
        setError('We could not add this tour. Please try again.')
      }
      return
    }
    setOwnedSource('free')
    setOwned(true)
    setNotice('Added to your tours.')
  }

  async function startCheckout() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/tours/${tourId}/checkout`, { method: 'POST' })
      const json = (await response.json().catch(() => ({}))) as {
        clientSecret?: string
        publishableKey?: string | null
        amountCents?: number | null
        currency?: string | null
        code?: string
      }
      if (!response.ok || !json.clientSecret) {
        const action = classifyCheckoutError(response.status, json.code)
        if (action === 'owned') {
          setOwned(true)
          setNotice(checkoutErrorMessage(action))
        } else if (action === 'claim_free') {
          setEffectivePrice(0)
          setNotice(checkoutErrorMessage(action))
        } else if (action === 'account_required') {
          setIsAnonymous(true)
        } else {
          setError(checkoutErrorMessage(action))
        }
        return
      }
      setCheckout({
        clientSecret: json.clientSecret,
        publishableKey: json.publishableKey ?? null,
        amountCents: json.amountCents ?? effectivePrice,
        currency: (json.currency ?? currency).toLowerCase(),
      })
      if (typeof json.amountCents === 'number') setEffectivePrice(json.amountCents)
    } catch {
      setError(checkoutErrorMessage('error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-labelledby="tour-get-heading"
      className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm"
      data-cta-state={state}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="tour-get-heading" className="text-lg font-bold text-night">Get this tour</h2>
        <p className="text-lg font-bold text-night">
          {state === 'owned' ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
              {tourOwnershipLabel({ source: ownedSource, priceCents: effectivePrice })}
            </span>
          ) : (
            priceLabel
          )}
        </p>
      </div>

      {state === 'loading' && (
        <div className="mt-4 h-11 w-full animate-pulse rounded-full bg-gray-100 sm:w-48" aria-label="Loading" />
      )}

      {state === 'sign_in' && (
        <div className="mt-4">
          <p className="text-sm text-charcoal">
            Sign in or create a free Baha Buddy account to {effectivePrice === 0 ? 'add' : 'buy'} this tour. It stays in your account and appears in the app.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link href={tourLoginHref(tourId)} className={PRIMARY_BUTTON}>Sign in</Link>
            <Link href={tourLoginHref(tourId, 'signup')} className={SECONDARY_BUTTON}>Create account</Link>
          </div>
        </div>
      )}

      {state === 'account_required' && (
        <div className="mt-4">
          <p className="text-sm text-charcoal">
            You are browsing as a guest. Create an account with your email so this tour can follow you into the app.
          </p>
          <div className="mt-4">
            <Link href={tourLoginHref(tourId, 'signup')} className={PRIMARY_BUTTON}>Create account</Link>
          </div>
        </div>
      )}

      {state === 'owned' && (
        <div className="mt-4">
          <p className="text-sm text-charcoal">
            This tour is in your account. Open the Baha Buddy app and sign in with the same account to start it.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link href="/profile/tours" className={PRIMARY_BUTTON}>Go to My tours</Link>
          </div>
        </div>
      )}

      {state === 'claim_free' && (
        <div className="mt-4">
          <p className="text-sm text-charcoal">Free for now. Add it to your account and start it in the app.</p>
          <div className="mt-4">
            <button type="button" onClick={claimFree} disabled={busy} className={PRIMARY_BUTTON}>
              {busy ? 'Adding…' : 'Add to my tours'}
            </button>
          </div>
        </div>
      )}

      {state === 'buy' && !checkout && (
        <div className="mt-4">
          <p className="text-sm text-charcoal">One-time purchase. The tour stays in your account and opens in the app.</p>
          <div className="mt-4">
            <button type="button" onClick={startCheckout} disabled={busy} className={PRIMARY_BUTTON}>
              {busy ? 'Opening checkout…' : `Buy for ${priceLabel}`}
            </button>
          </div>
        </div>
      )}

      {state === 'buy' && checkout && (
        <div className="mt-5">
          <CheckoutForm
            stripePromise={getStripeForPublishableKey(checkout.publishableKey)}
            clientSecret={checkout.clientSecret}
            amountCents={checkout.amountCents}
            currency={checkout.currency}
            tripName={title}
            returnUrl={returnUrl}
          />
        </div>
      )}

      {notice && <p role="status" className="mt-4 text-sm font-semibold text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="mt-4 text-sm font-semibold text-coral-700">{error}</p>}
    </section>
  )
}
