import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { CONCIERGE_OFFERS, getConciergeOffer } from '@/lib/stripe/concierge-offers'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'

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
    <main className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Secure account checkout"
        title={`Confirm your ${offer.name.replace('Baha Buddy ', '')}`}
        subtitle="Your payment will be linked to your Baha Buddy account so the team can deliver your itinerary into your dashboard and keep your planning history in one place."
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/concierge-trip-plan', label: 'Concierge' },
          { label: 'Checkout' },
        ]}
        actions={(
          <>
            <Link href="/concierge-trip-plan" className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50">
              Change offer
            </Link>
            <Link href="/dashboard" className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50">
              Dashboard
            </Link>
          </>
        )}
      />

      <section className="max-w-5xl mx-auto px-4 py-10">
        {searchParams?.checkout === 'cancelled' && (
          <div className="mb-6 flex gap-3 rounded-baha-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-charcoal">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold-400" aria-hidden="true" />
            <span>Checkout was cancelled. You can restart payment whenever you are ready.</span>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_0.8fr] gap-8 items-start">
          <div className="rounded-baha-xl bg-white border border-gray-200 p-6 lg:p-8 shadow-sm">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 uppercase tracking-wide">
              <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
              Signed in as
            </p>
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
              <Link href="/concierge-trip-plan" className="inline-flex items-center justify-center rounded-full bg-white border border-gray-300 px-5 py-2.5 text-night font-bold transition-colors hover:border-gray-400 hover:bg-gray-50">
                Change offer
              </Link>
              <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full bg-white border border-gray-300 px-5 py-2.5 text-night font-bold transition-colors hover:border-gray-400 hover:bg-gray-50">
                Go to dashboard
              </Link>
            </div>
          </div>

          <aside className="rounded-baha-xl bg-white border border-gray-200 p-6 shadow-sm">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 uppercase tracking-wide">
              <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
              Order summary
            </p>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-night">{offer.name}</h3>
                <p className="mt-2 text-sm text-charcoal leading-relaxed">{offer.description}</p>
              </div>
              <p className="text-3xl font-extrabold text-night">${offer.priceUsd}</p>
            </div>

            <div className="mt-6 rounded-baha-lg bg-gray-50 border border-gray-200 p-4 text-sm text-charcoal">
              <p className="font-bold mb-2">What happens next</p>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Pay securely with Stripe.</li>
                <li>Your Concierge order is created in your account.</li>
                <li>You submit or confirm trip details.</li>
                <li>The Baha Buddy team prepares your plan.</li>
              </ol>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-5">
              <p className="text-xs font-bold text-charcoal uppercase tracking-wide mb-3">Other offers</p>
              <div className="space-y-2">
                {Object.entries(CONCIERGE_OFFERS).map(([id, item]) => (
                  <Link key={id} href={`/concierge-trip-plan/checkout?offer=${id}`} className={`block rounded-baha-md border px-4 py-3 text-sm transition-colors ${id === offerId ? 'border-gray-900 bg-white text-night ring-2 ring-gray-100' : 'border-gray-200 text-charcoal hover:border-gray-300 hover:bg-gray-50'}`}>
                    <span className="inline-flex items-center gap-2 font-bold">
                      {id === offerId && <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />}
                      {item.name.replace('Baha Buddy ', '')}
                    </span>
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
