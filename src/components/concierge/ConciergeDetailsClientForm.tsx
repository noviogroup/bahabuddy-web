'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TravelSearchField,
  TravelSearchInput,
  TravelSearchTextarea,
} from '@/components/marketplace/TravelSearchFields'

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
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <TravelSearchField label="Name" htmlFor="concierge-detail-name" className="bg-white">
          <TravelSearchInput id="concierge-detail-name" name="traveler_name" defaultValue={order.traveler_name || ''} />
        </TravelSearchField>
        <TravelSearchField label="Email" htmlFor="concierge-detail-email" className="bg-white">
          <TravelSearchInput id="concierge-detail-email" name="traveler_email" type="email" defaultValue={order.traveler_email || ''} />
        </TravelSearchField>
        <TravelSearchField label="Travel dates" htmlFor="concierge-detail-dates" className="bg-white">
          <TravelSearchInput id="concierge-detail-dates" name="travel_dates" defaultValue={order.travel_dates || ''} placeholder="Exact or estimated" />
        </TravelSearchField>
        <TravelSearchField label="Group size" htmlFor="concierge-detail-party" className="bg-white">
          <TravelSearchInput id="concierge-detail-party" name="party_size" defaultValue={order.party_size || ''} placeholder="2 adults, family of 4" />
        </TravelSearchField>
        <TravelSearchField label="Budget range" htmlFor="concierge-detail-budget" className="bg-white">
          <TravelSearchInput id="concierge-detail-budget" name="budget_range" defaultValue={order.budget_range || ''} placeholder="Budget range" />
        </TravelSearchField>
        <TravelSearchField label="Preferred islands" htmlFor="concierge-detail-islands" className="bg-white">
          <TravelSearchInput id="concierge-detail-islands" name="destination_interests" defaultValue={order.destination_interests || ''} placeholder="Nassau, Exuma, Eleuthera" />
        </TravelSearchField>
      </div>
      <TravelSearchField label="Trip style and notes" htmlFor="concierge-detail-notes" className="bg-white">
        <TravelSearchTextarea id="concierge-detail-notes" name="notes" rows={5} defaultValue={order.notes || ''} />
      </TravelSearchField>
      <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
        {saving ? 'Saving…' : 'Submit trip details'}
      </button>
    </form>
  )
}
