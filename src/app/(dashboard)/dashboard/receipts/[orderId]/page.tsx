import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Params = { orderId: string }

function money(value: unknown) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0))
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function label(value: string | null | undefined) {
  return (value || 'unknown').replace(/_/g, ' ')
}

export default async function ReceiptPage({ params }: { params: Params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/dashboard/receipts/${params.orderId}`)}`)

  const { data: order } = await supabase
    .from('concierge_orders')
    .select('*')
    .eq('id', params.orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!order) notFound()

  const receiptNumber = `BB-${String(order.id).slice(0, 8).toUpperCase()}`
  const paid = order.payment_status === 'paid'

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-6 py-6 pb-10">
      <div className="mb-5 print:hidden">
        <Link href="/dashboard/payments" className="inline-flex rounded-full border border-gray-300 bg-white px-5 py-2.5 font-bold text-night hover:border-gray-400 hover:bg-gray-50">Back to payments</Link>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 p-6 md:p-8">
          <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-charcoal ring-1 ring-gray-200">Receipt</p>
          <h1 className="mt-4 text-3xl font-bold text-night">{receiptNumber}</h1>
          <p className="mt-2 text-charcoal">Baha Buddy Concierge Payment</p>
        </div>

        <div className="p-6 md:p-8">
          <div className="grid sm:grid-cols-2 gap-5 mb-8">
            <div><p className="text-xs font-bold uppercase text-charcoal">Billed to</p><p className="mt-2 font-bold text-night">{order.traveler_name || user.email}</p><p className="text-sm text-charcoal">{order.traveler_email || user.email}</p></div>
            <div className="sm:text-right"><p className="text-xs font-bold uppercase text-charcoal">Payment status</p><p className={`mt-2 text-xl font-bold capitalize ${paid ? 'text-green-700' : 'text-night'}`}>{label(order.payment_status)}</p><p className="text-sm text-charcoal">{new Date(order.created_at).toLocaleString()}</p></div>
          </div>

          <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200"><div className="grid grid-cols-[1fr_auto] gap-4 bg-gray-50 px-4 py-3 text-xs font-bold uppercase text-charcoal"><span>Description</span><span>Amount</span></div><div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-5 text-sm"><div><p className="font-bold text-night capitalize">{label(order.offer_type)}</p><p className="mt-1 text-charcoal">Baha Buddy Concierge planning service</p></div><p className="font-bold text-night">{money(order.price_usd)}</p></div><div className="grid grid-cols-[1fr_auto] gap-4 border-t border-gray-200 px-4 py-4"><p className="font-bold text-night">Total paid</p><p className="font-bold text-night">{paid ? money(order.price_usd) : money(0)}</p></div></div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm text-charcoal mb-8"><div><span className="font-bold text-night">Order ID:</span> {order.id}</div><div><span className="font-bold text-night">Stripe session:</span> {order.stripe_checkout_session_id || '—'}</div><div><span className="font-bold text-night">Payment intent:</span> {order.stripe_payment_intent_id || '—'}</div><div><span className="font-bold text-night">Source:</span> {order.source || '—'}</div></div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-charcoal"><p className="font-bold text-night">Thank you for choosing Baha Buddy.</p><p className="mt-2 text-sm leading-relaxed">This receipt confirms your Concierge order payment and is linked to your Baha Buddy account.</p></div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 print:hidden sm:flex-row"><Link href={`/dashboard/concierge/${order.id}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700"><span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />View order</Link><Link href="/dashboard/payments" className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 font-bold text-night hover:border-gray-400 hover:bg-gray-50">Payment history</Link></div>
    </div>
  )
}
