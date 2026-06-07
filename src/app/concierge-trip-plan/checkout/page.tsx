import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { CONCIERGE_OFFERS, getConciergeOffer } from '@/lib/stripe/concierge-offers'

export const metadata: Metadata = {
  title: 'Concierge Checkout',
  robots: { index: false },
}

type SearchParams = {
  offer?: string
  checkout?: string
  source?: string
}

export default async function ConciergeCheckoutPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const offerId = searchParams?.offer || 'concierge_trip_plan'
  const offer = getConciergeOffer(offerId)

  if (!offer) redirect('/concierge-trip-plan?checkout=invalid_offer')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const returnTo = `/concierge-trip-plan/checkout?offer=${encodeURIComponent(offerId)}&source=${encodeURIComponent(searchParams?.source || 'concierge_page')}`
    redirect(`/login?redirect=${encodeURIComponent(returnTo)}&mode=signup`)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <main className="min-h-screen bg-offwhite">
      <section className="bg-gradient-brand text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 lg:py-20">
          <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
            Secure account checkout
          </p>
          <h1 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight">
            Confirm your {offer.name.replace('Baha Buddy ', '')}
          </h1>
          <p className="mt-5 text-lg text-brand-50 leading-relaxed max-w-3xl">
            Your payment will be linked to your Baha Buddy account so the team can deliver your itinerary into your dashboard and keep your planning history in one place.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12 lg:py-16">
        {searchParams?.checkout === 'cancelled' && (
          <div className="mb-6 rounded-baha-lg border border-gold-200 bg-gold-50 px-4 py-3 text-sm font-semibold text-gold-800">
            Checkout was cancelled. You can restart payment whenever you are ready.
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_0.8fr] gap-8 items-start">
          <div className="rounded-baha-xl bg-white border border-sand-200 p-6 lg:p-8 shadow-card">
            <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">Signed in as</p>
            <h2 className="mt-2 text-2xl font-extrabold text-night">
              {profile?.display_name || user.email}
            </h2>
            <p className="mt-3 text-charcoal leading-relaxed">
              This checkout will create a Concierge order linked to your account. After payment, you will be sent to your dashboard order page.
            </p>

            <form action="/api/concierge-checkout" method="POST" className="mt-8 space-y-4">
              <input type="hidden" name="offer_id" value={offerId} />
              <input type="hidden" name="source" value={searchParams?.source || 'concierge_page'} />
              <button type="submit" className="w-full rounded-full bg-brand-600 px-6 py-3 text-white font-bold hover:bg-brand-700 transition-colors">
                Continue to Stripe — ${offer.priceUsd}
              </button>
            </form>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link href="/concierge-trip-plan" className="inline-flex items-center justify-center rounded-full bg-white border border-sand-200 px-5 py-2.5 text-charcoal font-bold hover:bg-sand-50 transition-colors">
                Change offer
              </Link>
              <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full bg-brand-50 px-5 py-2.5 text-brand-700 font-bold hover:bg-brand-100 transition-colors">
                Go to dashboard
              </Link>
            </div>
          </div>

          <aside className="rounded-baha-xl bg-white border border-sand-200 p-6 shadow-card">
            <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">Order summary</p>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-night">{offer.name}</h3>
                <p className="mt-2 text-sm text-charcoal leading-relaxed">{offer.description}</p>
              </div>
              <p className="text-3xl font-extrabold text-night">${offer.priceUsd}</p>
            </div>

            <div className="mt-6 rounded-baha-lg bg-brand-50 border border-brand-100 p-4 text-sm text-brand-900">
              <p className="font-bold mb-2">What happens next</p>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Pay securely with Stripe.</li>
                <li>Your Concierge order is created in your account.</li>
                <li>You submit or confirm trip details.</li>
                <li>The Baha Buddy team prepares your plan.</li>
              </ol>
            </div>

            <div className="mt-6 border-t border-sand-200 pt-5">
              <p className="text-xs font-bold text-charcoal uppercase tracking-wide mb-3">Other offers</p>
              <div className="space-y-2">
                {Object.entries(CONCIERGE_OFFERS).map(([id, item]) => (
                  <Link key={id} href={`/concierge-trip-plan/checkout?offer=${id}`} className={`block rounded-baha-md border px-4 py-3 text-sm transition-colors ${id === offerId ? 'border-brand-300 bg-brand-50 text-brand-900' : 'border-sand-200 hover:bg-sand-50 text-charcoal'}`}>
                    <span className="font-bold">{item.name.replace('Baha Buddy ', '')}</span>
                    <span className="float-right font-extrabold">${item.priceUsd}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  )
}
