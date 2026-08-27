import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ConciergeDetailsClientForm } from '@/components/concierge/ConciergeDetailsClientForm'

export const dynamic = 'force-dynamic'

type Params = { orderId: string }

export default async function ConciergeOrderDetailsPage({ params }: { params: Params }) {
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
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <p className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-charcoal">Concierge details</p>
        <h1 className="mt-4 text-3xl font-bold text-night">Tell us what to plan</h1>
        <p className="mt-3 leading-relaxed text-charcoal">Share your dates, group size, budget, preferred islands, and travel style so the Baha Buddy team can prepare your Concierge plan.</p>
      </div>

      <ConciergeDetailsClientForm order={order} />

      <div className="mt-4">
        <Link href={`/dashboard/concierge/${order.id}`} className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 font-bold text-night hover:border-gray-400 hover:bg-gray-50">Back to order</Link>
      </div>
    </div>
  )
}
