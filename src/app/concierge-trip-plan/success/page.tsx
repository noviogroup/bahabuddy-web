import type { Metadata } from 'next'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Concierge Payment Confirmed',
  robots: { index: false },
}

const offerLabels: Record<string, string> = {
  quick_review: 'Quick Review',
  concierge_trip_plan: 'Concierge Trip Plan',
  full_planning_support: 'Full Planning Support',
}

export default function ConciergeSuccessPage({
  searchParams,
}: {
  searchParams?: { session_id?: string; offer?: string }
}) {
  const offer = searchParams?.offer ? offerLabels[searchParams.offer] ?? 'Concierge Trip Plan' : 'Concierge Trip Plan'

  return (
    <main className="min-h-screen bg-offwhite">
      <PublicHeader />
      <section className="bg-gradient-brand text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
            Payment confirmed
          </p>
          <h1 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight">
            Your {offer} payment was successful.
          </h1>
          <p className="mt-5 text-lg text-brand-50 leading-relaxed max-w-2xl mx-auto">
            The next step is to send the travel details needed to prepare your plan. Your Stripe
            confirmation should also be sent to the email used at checkout.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-14 lg:py-20">
        <div className="rounded-baha-xl bg-white border border-sand-200 p-6 lg:p-8 shadow-card">
          <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-8">
            <div>
              <p className="text-sm font-bold text-brand-700 uppercase tracking-wide">Required next step</p>
              <h2 className="mt-3 text-3xl font-extrabold text-night">Send your trip details</h2>
              <p className="mt-4 text-charcoal leading-relaxed">
                This form gives the Baha Buddy team the dates, group size, budget, island interests,
                and special notes needed to prepare your itinerary.
              </p>
              <div className="mt-6 rounded-baha-lg bg-brand-50 border border-brand-100 p-4 text-sm text-brand-900">
                Stripe session reference: <span className="font-mono text-xs">{searchParams?.session_id ?? 'Not available'}</span>
              </div>
            </div>

            <form
              name="baha-buddy-paid-concierge-details"
              method="POST"
              action="/concierge-trip-plan/success?submitted=details"
              data-netlify="true"
              className="space-y-4"
            >
              <input type="hidden" name="form-name" value="baha-buddy-paid-concierge-details" />
              <input type="hidden" name="stripe_session_id" value={searchParams?.session_id ?? ''} />
              <input type="hidden" name="offer" value={offer} />

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-semibold text-night">Name *</span>
                  <input name="name" required className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-night">Email used at checkout *</span>
                  <input name="email" type="email" required className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-night">Travel dates</span>
                  <input name="travel_dates" placeholder="Exact or estimated" className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-night">Group size</span>
                  <input name="group_size" placeholder="2 adults, family of 4..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-night">Budget range</span>
                  <input name="budget_range" placeholder="$1,500-$3,000, luxury, flexible..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-night">Preferred island(s)</span>
                  <input name="islands" placeholder="Nassau, Exuma, Eleuthera..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-night">Trip style and notes</span>
                <textarea name="notes" rows={4} placeholder="Family, honeymoon, luxury, nightlife, adventure, food, accessibility, must-do activities..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm outline-none focus:border-brand-500" />
              </label>

              <button type="submit" className="w-full rounded-full bg-brand-600 px-6 py-3 text-white font-bold hover:bg-brand-700 transition-colors">
                Submit trip details
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard/chat?intent=concierge" className="inline-flex items-center justify-center rounded-full bg-brand-50 px-6 py-3 text-brand-700 font-bold hover:bg-brand-100 transition-colors">
            Continue planning with Buddy
          </Link>
          <Link href="/" className="inline-flex items-center justify-center rounded-full bg-white border border-sand-200 px-6 py-3 text-charcoal font-bold hover:bg-sand-50 transition-colors">
            Back to homepage
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
