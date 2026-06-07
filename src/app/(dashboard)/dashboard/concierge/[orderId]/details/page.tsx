import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ConciergeDetailsClientForm } from '@/components/concierge/ConciergeDetailsClientForm'

export const dynamic = 'force-dynamic'

type Params = { orderId: string }
type SearchParams = { saved?: string }

export default async function ConciergeOrderDetailsPage({ params, searchParams }: { params: Params; searchParams?: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/dashboard/concierge/${params.orderId}/details`)}`)

  const { data: order } = await supabase
    .from('concierge_orders')
    .select('id, offer_type, traveler_name, traveler_email, travel_dates, party_size, budget_range, destination_interests, notes')
    .eq('id', params.orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!order) notFound()

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-6 py-6 pb-10">
      <div className="rounded-3xl bg-gradient-brand text-white p-6 md:p-8 shadow-card mb-6">
        <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur">Concierge details</p>
        <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight">Tell us what to plan</h1>
        <p className="mt-3 text-brand-50 leading-relaxed">Share your dates, group size, budget, preferred islands, and travel style so the Baha Buddy team can prepare your Concierge plan.</p>
      </div>

      <ConciergeDetailsClientForm order={order} />

      <div className="mt-4">
        <Link href={`/dashboard/concierge/${order.id}`} className="inline-flex items-center justify-center rounded-full bg-white border border-sand-200 px-6 py-3 text-brand-700 font-bold hover:bg-sand-50">Back to order</Link>
      </div>
    </div>
  )
}
