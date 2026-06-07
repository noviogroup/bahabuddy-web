import { redirect, notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Params = { orderId: string }
type SearchParams = { saved?: string }

export default async function ConciergeOrderDetailsPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams?: SearchParams
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/dashboard/concierge/${params.orderId}/details`)}`)
  }

  async function saveDetails(formData: FormData) {
    'use server'

    const actionSupabase = await createClient()
    const { data: { user: actionUser } } = await actionSupabase.auth.getUser()

    if (!actionUser) {
      redirect(`/login?redirect=${encodeURIComponent(`/dashboard/concierge/${params.orderId}/details`)}`)
    }

    const updates = {
      traveler_name: String(formData.get('traveler_name') || '').trim() || null,
      traveler_email: String(formData.get('traveler_email') || '').trim() || null,
      travel_dates: String(formData.get('travel_dates') || '').trim() || null,
      party_size: String(formData.get('party_size') || '').trim() || null,
      budget_range: String(formData.get('budget_range') || '').trim() || null,
      destination_interests: String(formData.get('destination_interests') || '').trim() || null,
      notes: String(formData.get('notes') || '').trim() || null,
      status: 'in_review',
      updated_at: new Date().toISOString(),
    }

    await actionSupabase
      .from('concierge_orders')
      .update(updates)
      .eq('id', params.orderId)
      .eq('user_id', actionUser.id)

    revalidatePath(`/dashboard/concierge/${params.orderId}`)
    revalidatePath(`/dashboard/concierge/${params.orderId}/details`)
    redirect(`/dashboard/concierge/${params.orderId}?saved=details`)
  }

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

      <form action={saveDetails} className="rounded-3xl bg-white border border-sand-200 p-6 shadow-card space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm font-bold text-night">Name<input name="traveler_name" defaultValue={order.traveler_name || ''} className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
          <label className="block text-sm font-bold text-night">Email<input name="traveler_email" type="email" defaultValue={order.traveler_email || ''} className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
          <label className="block text-sm font-bold text-night">Travel dates<input name="travel_dates" defaultValue={order.travel_dates || ''} placeholder="Exact or estimated" className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
          <label className="block text-sm font-bold text-night">Group size<input name="party_size" defaultValue={order.party_size || ''} placeholder="2 adults, family of 4..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
          <label className="block text-sm font-bold text-night">Budget range<input name="budget_range" defaultValue={order.budget_range || ''} placeholder="$1,500-$3,000, luxury, flexible..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
          <label className="block text-sm font-bold text-night">Preferred island(s)<input name="destination_interests" defaultValue={order.destination_interests || ''} placeholder="Nassau, Exuma, Eleuthera..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
        </div>

        <label className="block text-sm font-bold text-night">Trip style and notes<textarea name="notes" rows={5} defaultValue={order.notes || ''} placeholder="Family, honeymoon, luxury, nightlife, adventure, food, accessibility, must-do activities..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" className="inline-flex flex-1 items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-white font-bold hover:bg-brand-700">Submit trip details</button>
          <Link href={`/dashboard/concierge/${order.id}`} className="inline-flex items-center justify-center rounded-full bg-white border border-sand-200 px-6 py-3 text-brand-700 font-bold hover:bg-sand-50">Back to order</Link>
        </div>
      </form>
    </div>
  )
}
