import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function money(value: unknown) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0))
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function label(value: string | null | undefined) {
  return (value || 'unknown').replace(/_/g, ' ')
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/dashboard/payments')

  const { data: orders } = await supabase
    .from('concierge_orders')
    .select('id, offer_type, price_usd, status, payment_status, stripe_checkout_session_id, stripe_payment_intent_id, source, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const paidOrders = orders || []
  const totalPaid = paidOrders
    .filter(order => order.payment_status === 'paid')
    .reduce((sum, order) => sum + Number(order.price_usd || 0), 0)

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-6 py-6 pb-10">
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <p className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-charcoal">Payments</p>
        <h1 className="mt-4 text-3xl font-bold text-night">Your Baha Buddy payments</h1>
        <p className="mt-3 leading-relaxed text-charcoal">Review Concierge purchases, payment status, order status, and receipts linked to your account.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-charcoal">Total paid</p>
          <p className="mt-2 text-2xl font-bold text-night">{money(totalPaid)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-charcoal">Orders</p>
          <p className="mt-2 text-2xl font-bold text-night">{paidOrders.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-bold text-night">Payment history</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {paidOrders.map(order => (
            <div key={order.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-bold text-night capitalize">{label(order.offer_type)}</p>
                <p className="mt-1 text-sm text-charcoal capitalize">Payment: {label(order.payment_status)} · Order: {label(order.status)}</p>
                <p className="mt-1 text-xs text-charcoal">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xl font-bold text-night">{money(order.price_usd)}</p>
                <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
                  <Link href={`/dashboard/concierge/${order.id}`} className="inline-flex rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night hover:border-gray-400 hover:bg-gray-50">Order</Link>
                  <Link href={`/dashboard/receipts/${order.id}`} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"><span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />Receipt</Link>
                </div>
              </div>
            </div>
          ))}
          {paidOrders.length === 0 && (
            <div className="p-8 text-center text-charcoal">
              <p className="font-bold text-night">No payments yet</p>
              <p className="mt-2 text-sm">Concierge purchases will appear here after checkout.</p>
              <Link href="/concierge-trip-plan" className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700"><span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />View Concierge offers</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
