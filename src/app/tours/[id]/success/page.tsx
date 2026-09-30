import type { Metadata } from 'next'

import Footer from '@/components/Footer'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import TourPurchaseStatus from '@/components/tours/TourPurchaseStatus'
import { getCatalogTour, isTourId } from '@/lib/self-guided-tours'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your tour | Baha Buddy',
  robots: { index: false },
}

interface PageProps {
  params: { id: string }
  searchParams: { redirect_status?: string }
}

/**
 * Stripe return_url for self-guided tour checkout. Stripe appends
 * payment_intent, payment_intent_client_secret and redirect_status; the
 * entitlement itself comes from stripe-webhook, so the client polls
 * tour_entitlements until it is granted.
 */
export default async function TourPurchaseSuccessPage({ params, searchParams }: PageProps) {
  if (!isTourId(params.id)) notFound()
  let title = 'Your tour'
  try {
    const tour = await getCatalogTour(await createClient(), params.id)
    if (tour) title = tour.title
  } catch {
    // Title is cosmetic; the status still resolves from the entitlement.
  }

  return (
    <div className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Self-guided tour"
        title={title}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/tours', label: 'Self-guided tours' },
          { href: `/tours/${params.id}`, label: title },
          { label: 'Confirmation' },
        ]}
      />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <TourPurchaseStatus tourId={params.id} tourTitle={title} redirectStatus={searchParams.redirect_status ?? null} />
      </main>
      <Footer />
    </div>
  )
}
