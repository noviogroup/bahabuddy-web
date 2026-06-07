'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type ConciergeDetailsOrder = {
  id: string
  traveler_name?: string | null
  traveler_email?: string | null
  travel_dates?: string | null
  party_size?: string | null
  budget_range?: string | null
  destination_interests?: string | null
  notes?: string | null
}

export function ConciergeDetailsClientForm({ order }: { order: ConciergeDetailsOrder }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const payload = {
      order_id: order.id,
      traveler_name: String(formData.get('traveler_name') || ''),
      traveler_email: String(formData.get('traveler_email') || ''),
      travel_dates: String(formData.get('travel_dates') || ''),
      party_size: String(formData.get('party_size') || ''),
      budget_range: String(formData.get('budget_range') || ''),
      destination_interests: String(formData.get('destination_interests') || ''),
      notes: String(formData.get('notes') || ''),
      mark_details_submitted: true,
    }

    const res = await fetch('/api/concierge-order-details', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error || 'Could not save trip details.')
      setSaving(false)
      return
    }

    router.push(`/dashboard/concierge/${order.id}?saved=details`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl bg-white border border-sand-200 p-6 shadow-card space-y-4">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-bold text-night">Name<input name="traveler_name" defaultValue={order.traveler_name || ''} className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
        <label className="block text-sm font-bold text-night">Email<input name="traveler_email" type="email" defaultValue={order.traveler_email || ''} className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
        <label className="block text-sm font-bold text-night">Travel dates<input name="travel_dates" defaultValue={order.travel_dates || ''} placeholder="Exact or estimated" className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
        <label className="block text-sm font-bold text-night">Group size<input name="party_size" defaultValue={order.party_size || ''} placeholder="2 adults, family of 4..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
        <label className="block text-sm font-bold text-night">Budget range<input name="budget_range" defaultValue={order.budget_range || ''} placeholder="Budget range" className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
        <label className="block text-sm font-bold text-night">Preferred island(s)<input name="destination_interests" defaultValue={order.destination_interests || ''} placeholder="Nassau, Exuma, Eleuthera..." className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
      </div>
      <label className="block text-sm font-bold text-night">Trip style and notes<textarea name="notes" rows={5} defaultValue={order.notes || ''} className="mt-2 w-full rounded-baha-md border border-sand-300 px-4 py-3 text-sm font-normal" /></label>
      <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-white font-bold hover:bg-brand-700 disabled:opacity-60">{saving ? 'Saving…' : 'Submit trip details'}</button>
    </form>
  )
}
