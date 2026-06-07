import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Params = { orderId: string }
type SearchParams = { session_id?: string; saved?: string }

function money(value: unknown) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0))
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function statusLabel(status: string | null | undefined) {
  return (status || 'pending').replace(/_/g, ' ')
}

export default async function ConciergeOrderPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams?: SearchParams
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/dashboard/concierge/${params.orderId}`)}`)

  const { data: order } = await supabase
    .from('concierge_orders')
    .select('*')
    .eq('id', params.orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!order) notFound()

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-6 py-6 pb-10">
      <div className="rounded-3xl bg-gradient-brand text-white p-6 md:p-8 shadow-card mb-6">
        <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur">
          Concierge order
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight capitalize">
          {order.offer_type?.replace(/_/g, ' ')}
        </h1>
        <p className="mt-3 text-brand-50 leading-relaxed">
          Your payment and order are linked to your Baha Buddy account. The team will review your details and prepare your plan.
        </p>
      </div>

      {searchParams?.session_id && (
        <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 mb-6">
          Payment session received. Stripe reference: <span className="font-mono text-xs">{searchParams.session_id}</span>
        </div>
      )}

      {searchParams?.saved === 'details' && (
        <div className="rounded-2xl bg-brand-50 border border-brand-100 px-4 py-3 text-sm text-brand-900 mb-6">
          Trip details saved. Your order is now in review.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl bg-white border border-sand-200 p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Order status</p>
          <p className="mt-2 text-2xl font-extrabold text-night capitalize">{statusLabel(order.status)}</p>
          <p className="mt-1 text-sm text-charcoal">Payment: <span className="capitalize font-semibold">{statusLabel(order.payment_status)}</span></p>
        </div>
        <div className="rounded-2xl bg-white border border-sand-200 p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Amount paid</p>
          <p className="mt-2 text-2xl font-extrabold text-night">{money(order.price_usd)}</p>
          <p className="mt-1 text-sm text-charcoal">Source: {order.source || 'Baha Buddy'}</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-sand-200 p-6 shadow-card mb-6">
        <h2 className="text-xl font-extrabold text-night mb-4">Trip details on file</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-charcoal">
          <div><span className="font-bold text-night">Travel dates:</span> {order.travel_dates || 'Not submitted yet'}</div>
          <div><span className="font-bold text-night">Group size:</span> {order.party_size || 'Not submitted yet'}</div>
          <div><span className="font-bold text-night">Budget:</span> {order.budget_range || 'Not submitted yet'}</div>
          <div><span className="font-bold text-night">Preferred islands:</span> {order.destination_interests || 'Not submitted yet'}</div>
        </div>
        {order.notes && <p className="mt-4 text-sm text-charcoal"><span className="font-bold text-night">Notes:</span> {order.notes}</p>}
      </div>

      {order.delivered_plan_url || order.final_itinerary ? (
        <div className="rounded-3xl bg-white border border-sand-200 p-6 shadow-card mb-6">
          <h2 className="text-xl font-extrabold text-night mb-3">Delivered plan</h2>
          {order.delivered_plan_url && <Link href={order.delivered_plan_url} className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-white font-bold hover:bg-brand-700" target="_blank">Open delivered plan</Link>}
          {order.final_itinerary && <p className="mt-4 whitespace-pre-wrap text-sm text-charcoal leading-relaxed">{order.final_itinerary}</p>}
        </div>
      ) : (
        <div className="rounded-3xl bg-brand-50 border border-brand-100 p-6 text-brand-900 mb-6">
          <h2 className="text-lg font-extrabold mb-2">Next step</h2>
          <p className="text-sm leading-relaxed">Submit your travel dates, group size, budget, and preferred islands so we can begin preparing your plan.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href={`/dashboard/concierge/${order.id}/details`} className="inline-flex items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-white font-bold hover:bg-brand-700">
          Submit trip details
        </Link>
        <Link href="/dashboard/chat?intent=concierge" className="inline-flex items-center justify-center rounded-full bg-white border border-sand-200 px-6 py-3 text-brand-700 font-bold hover:bg-sand-50">
          Continue planning with Buddy
        </Link>
      </div>
    </div>
  )
}
