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

export default async function ConciergeOrderPage({ params, searchParams }: { params: Params; searchParams?: SearchParams }) {
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

  const createRelatedTripHref = `/dashboard/trips/new?${new URLSearchParams({
    returnTo: `/dashboard/concierge/${order.id}`,
    source: 'concierge_order',
    seed: `Create a Bahamas trip for this ${String(order.offer_type || 'Concierge order').replace(/_/g, ' ')} so stays, flights, food, activities, transfers, and documents can be planned directly.`,
  }).toString()}`

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-6 py-6 pb-10">
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <p className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-charcoal">Concierge order</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-night capitalize md:text-4xl">{order.offer_type?.replace(/_/g, ' ')}</h1>
        <p className="mt-3 leading-relaxed text-charcoal">Your payment and order are linked to your Baha Buddy account. The team will review your details and prepare your plan.</p>
      </div>

      {searchParams?.session_id && <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 mb-6">Payment session received. Stripe reference: <span className="font-mono text-xs">{searchParams.session_id}</span></div>}
      {searchParams?.saved === 'details' && <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-charcoal">Trip details saved. Your order is now in review.</div>}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-charcoal">Order status</p><p className="mt-2 text-2xl font-extrabold text-night capitalize">{statusLabel(order.status)}</p><p className="mt-1 text-sm text-charcoal">Payment: <span className="capitalize font-semibold">{statusLabel(order.payment_status)}</span></p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-charcoal">Amount paid</p><p className="mt-2 text-2xl font-extrabold text-night">{money(order.price_usd)}</p><div className="mt-3 flex flex-wrap gap-2"><Link href={`/dashboard/receipts/${order.id}`} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"><span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />View receipt</Link><Link href="/dashboard/payments" className="inline-flex rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-night hover:border-gray-400 hover:bg-gray-50">Payments</Link></div></div>
      </div>

      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-extrabold text-night mb-4">Trip details on file</h2><div className="grid sm:grid-cols-2 gap-4 text-sm text-charcoal"><div><span className="font-bold text-night">Travel dates:</span> {order.travel_dates || 'Not submitted yet'}</div><div><span className="font-bold text-night">Group size:</span> {order.party_size || 'Not submitted yet'}</div><div><span className="font-bold text-night">Budget:</span> {order.budget_range || 'Not submitted yet'}</div><div><span className="font-bold text-night">Preferred islands:</span> {order.destination_interests || 'Not submitted yet'}</div></div>{order.notes && <p className="mt-4 text-sm text-charcoal"><span className="font-bold text-night">Notes:</span> {order.notes}</p>}</div>

      {order.delivered_plan_url || order.final_itinerary ? <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"><h2 className="mb-3 text-xl font-extrabold text-night">Delivered plan</h2>{order.delivered_plan_url && <Link href={order.delivered_plan_url} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700" target="_blank"><span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />Open delivered plan</Link>}{order.final_itinerary && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">{order.final_itinerary}</p>}</div> : <div className="mb-6 rounded-3xl border border-gray-200 bg-gray-50 p-6 text-charcoal"><h2 className="mb-2 text-lg font-extrabold text-night">Next step</h2><p className="text-sm leading-relaxed">Submit your travel dates, group size, budget, and preferred islands so we can begin preparing your plan.</p></div>}

      <div className="flex flex-col gap-3 sm:flex-row"><Link href={`/dashboard/concierge/${order.id}/details`} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700"><span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />Submit trip details</Link><Link href={createRelatedTripHref} className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 font-bold text-night hover:border-gray-400 hover:bg-gray-50">Create related trip</Link></div>
    </div>
  )
}
