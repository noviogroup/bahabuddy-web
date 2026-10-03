'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import OpenInAppInstructions from '@/components/tours/OpenInAppInstructions'
import { hasTourEntitlement, pollForEntitlement } from '@/lib/self-guided-tours'
import { createClient } from '@/lib/supabase/client'

type Status = 'checking' | 'granted' | 'pending' | 'failed' | 'signed_out'

export interface TourPurchaseStatusProps {
  tourId: string
  tourTitle: string
  /** Stripe's redirect_status query param. */
  redirectStatus?: string | null
}

/**
 * Post-checkout page body. Stripe redirects here; stripe-webhook grants the
 * entitlement asynchronously, so we poll tour_entitlements until it lands.
 */
export default function TourPurchaseStatus({ tourId, tourTitle, redirectStatus }: TourPurchaseStatusProps) {
  const supabase = useMemo(() => createClient(), [])
  const paymentFailed = redirectStatus === 'failed' || redirectStatus === 'requires_payment_method'
  const [status, setStatus] = useState<Status>(paymentFailed ? 'failed' : 'checking')
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (paymentFailed) return
    const controller = new AbortController()
    supabase.auth.getUser().then(async ({ data }) => {
      if (controller.signal.aborted) return
      if (!data.user) {
        setStatus('signed_out')
        return
      }
      setEmail(data.user.email ?? null)
      const outcome = await pollForEntitlement({
        check: () => hasTourEntitlement(supabase, tourId),
        signal: controller.signal,
      })
      if (outcome === 'granted') setStatus('granted')
      else if (outcome === 'timeout') setStatus('pending')
    }).catch(() => {
      if (!controller.signal.aborted) setStatus('pending')
    })
    return () => controller.abort()
  }, [supabase, tourId, paymentFailed])

  return (
    <div className="space-y-6" data-status={status}>
      <section role="status" className="rounded-baha-lg border border-gray-200 bg-white p-6 shadow-sm">
        {status === 'checking' && (
          <>
            <h2 className="text-xl font-bold text-night">Confirming your payment…</h2>
            <p className="mt-2 text-sm text-charcoal">This usually takes a few seconds. Keep this page open.</p>
          </>
        )}
        {status === 'granted' && (
          <>
            <h2 className="text-xl font-bold text-night">{tourTitle} is yours</h2>
            <p className="mt-2 text-sm text-charcoal">The tour is saved to your account.</p>
          </>
        )}
        {status === 'pending' && (
          <>
            <h2 className="text-xl font-bold text-night">Payment received — still confirming</h2>
            <p className="mt-2 text-sm text-charcoal">
              Your tour will appear in My tours as soon as the payment clears. You do not need to pay again.
            </p>
          </>
        )}
        {status === 'failed' && (
          <>
            <h2 className="text-xl font-bold text-night">Payment did not go through</h2>
            <p className="mt-2 text-sm text-charcoal">You were not charged. You can try again from the tour page.</p>
          </>
        )}
        {status === 'signed_out' && (
          <>
            <h2 className="text-xl font-bold text-night">Sign in to see your tour</h2>
            <p className="mt-2 text-sm text-charcoal">Sign in with the account you used at checkout.</p>
          </>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          {status === 'signed_out' ? (
            <Link href={`/login?redirect=${encodeURIComponent(`/tours/${tourId}/success`)}`} className="inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">
              Sign in
            </Link>
          ) : status === 'failed' ? (
            <Link href={`/tours/${tourId}`} className="inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">
              Back to the tour
            </Link>
          ) : (
            <Link href="/profile/tours" className="inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">
              Go to My tours
            </Link>
          )}
          <Link href="/tours" className="inline-flex min-h-11 items-center rounded-full border border-gray-300 px-5 py-3 text-sm font-bold text-night hover:border-brand-600">
            Browse tours
          </Link>
        </div>
      </section>

      {(status === 'granted' || status === 'pending') && <OpenInAppInstructions email={email} />}
    </div>
  )
}
