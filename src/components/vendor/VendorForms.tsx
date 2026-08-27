'use client'

import { useMemo, useState } from 'react'
import type { VendorListing, VendorPartner } from '@/lib/vendor-portal'

type SubmitState = { status: 'idle' | 'saving' | 'success' | 'error'; message: string }

const initialState: SubmitState = { status: 'idle', message: '' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold leading-5 text-gray-600">{label}</span>
      {children}
    </label>
  )
}

function inputClass(extra = '') {
  return `min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium leading-6 text-night outline-none transition placeholder:text-gray-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-50 ${extra}`
}

function textareaClass(extra = '') {
  return `w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm font-medium leading-6 text-night outline-none transition placeholder:text-gray-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-50 ${extra}`
}

function SubmitMessage({ state }: { state: SubmitState }) {
  if (state.status !== 'success' && state.status !== 'error') return null
  return (
    <div
      role={state.status === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm font-semibold leading-6 ${
        state.status === 'success'
          ? 'border-palm-100 bg-palm-50 text-palm-700'
          : 'border-red-100 bg-red-50 text-red-700'
      }`}
    >
      {state.message}
    </div>
  )
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Request failed: ${response.status}`)
  return body
}

export function VendorProfileSubmissionForm({ partner }: { partner: VendorPartner }) {
  const [state, setState] = useState<SubmitState>(initialState)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState({ status: 'saving', message: '' })
    const form = new FormData(event.currentTarget)
    const payload = {
      partner_id: partner.id,
      name: form.get('name'),
      contact_name: form.get('contact_name'),
      contact_email: form.get('contact_email'),
      contact_phone: form.get('contact_phone'),
      website: form.get('website'),
      island_name: form.get('island_name'),
      description: form.get('description'),
      note: form.get('note'),
    }

    try {
      await parseResponse(await fetch('/api/vendor/profile-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }))
      event.currentTarget.reset()
      setState({ status: 'success', message: 'Profile update submitted for admin review.' })
    } catch (error) {
      setState({ status: 'error', message: (error as Error).message })
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-bold leading-7 text-night">Profile update submission</h2>
        <p className="mt-1 text-sm leading-6 text-charcoal">Updates stay pending until admin approval.</p>
      </div>
      <SubmitMessage state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Partner name">
          <input name="name" defaultValue={partner.name} className={inputClass()} />
        </Field>
        <Field label="Island">
          <input name="island_name" defaultValue={partner.island_name ?? ''} className={inputClass()} />
        </Field>
        <Field label="Contact name">
          <input name="contact_name" defaultValue={partner.contact_name ?? ''} className={inputClass()} />
        </Field>
        <Field label="Contact email">
          <input name="contact_email" type="email" defaultValue={partner.contact_email ?? ''} className={inputClass()} />
        </Field>
        <Field label="Contact phone">
          <input name="contact_phone" defaultValue={partner.contact_phone ?? ''} className={inputClass()} />
        </Field>
        <Field label="Website">
          <input name="website" type="url" defaultValue={partner.website ?? ''} className={inputClass()} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea name="description" defaultValue={partner.description ?? ''} rows={6} className={textareaClass()} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Review note">
            <textarea name="note" rows={3} className={textareaClass()} />
          </Field>
        </div>
      </div>
      <button
        type="submit"
        disabled={state.status === 'saving'}
        className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-5 text-sm font-bold leading-5 text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state.status === 'saving' ? 'Submitting...' : 'Submit profile update'}
      </button>
    </form>
  )
}

export function VendorDealSubmissionForm({ partnerId, listings }: { partnerId: string; listings: VendorListing[] }) {
  const [state, setState] = useState<SubmitState>(initialState)
  const placeOptions = useMemo(() => listings.filter((listing) => listing.place), [listings])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState({ status: 'saving', message: '' })
    const form = new FormData(event.currentTarget)
    const payload = {
      partner_id: partnerId,
      title: form.get('title'),
      deal_type: form.get('deal_type'),
      place_id: form.get('place_id'),
      description: form.get('description'),
      price_from: form.get('price_from'),
      cta_label: form.get('cta_label'),
      cta_url: form.get('cta_url'),
      starts_at: form.get('starts_at'),
      ends_at: form.get('ends_at'),
      note: form.get('note'),
    }

    try {
      await parseResponse(await fetch('/api/vendor/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }))
      event.currentTarget.reset()
      setState({ status: 'success', message: 'Deal proposal submitted for admin review.' })
    } catch (error) {
      setState({ status: 'error', message: (error as Error).message })
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-bold leading-7 text-night">Deal submission</h2>
        <p className="mt-1 text-sm leading-6 text-charcoal">Approved proposals become canonical Baha Buddy deals.</p>
      </div>
      <SubmitMessage state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Deal title">
          <input name="title" required maxLength={160} className={inputClass()} />
        </Field>
        <Field label="Deal type">
          <select name="deal_type" defaultValue="partner_offer" className={inputClass()}>
            <option value="partner_offer">Partner offer</option>
            <option value="featured_place">Featured place</option>
            <option value="sponsored_content">Sponsored content</option>
            <option value="concierge_upsell">Concierge upsell</option>
            <option value="tour_promotion">Tour promotion</option>
          </select>
        </Field>
        <Field label="Linked listing">
          <select name="place_id" className={inputClass()}>
            <option value="">No specific listing</option>
            {placeOptions.map((listing) => (
              <option key={listing.place_id} value={listing.place_id}>
                {listing.place?.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price from">
          <input name="price_from" type="number" min="0" step="0.01" className={inputClass()} />
        </Field>
        <Field label="CTA label">
          <input name="cta_label" placeholder="View offer" className={inputClass()} />
        </Field>
        <Field label="CTA URL">
          <input name="cta_url" type="url" className={inputClass()} />
        </Field>
        <Field label="Starts">
          <input name="starts_at" type="date" className={inputClass()} />
        </Field>
        <Field label="Ends">
          <input name="ends_at" type="date" className={inputClass()} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea name="description" required rows={6} className={textareaClass()} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Review note">
            <textarea name="note" rows={3} className={textareaClass()} />
          </Field>
        </div>
      </div>
      <button
        type="submit"
        disabled={state.status === 'saving'}
        className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-5 text-sm font-bold leading-5 text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state.status === 'saving' ? 'Submitting...' : 'Submit deal proposal'}
      </button>
    </form>
  )
}

export function VendorPhotoSubmissionForm({ partnerId, listings }: { partnerId: string; listings: VendorListing[] }) {
  const [state, setState] = useState<SubmitState>(initialState)
  const placeOptions = useMemo(() => listings.filter((listing) => listing.place), [listings])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState({ status: 'saving', message: '' })
    const form = new FormData(event.currentTarget)
    form.set('partner_id', partnerId)

    try {
      await parseResponse(await fetch('/api/vendor/photos', {
        method: 'POST',
        body: form,
      }))
      event.currentTarget.reset()
      setState({ status: 'success', message: 'Photo submitted for admin review.' })
    } catch (error) {
      setState({ status: 'error', message: (error as Error).message })
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-bold leading-7 text-night">Media submission</h2>
        <p className="mt-1 text-sm leading-6 text-charcoal">Images are uploaded to place-gallery and held for review.</p>
      </div>
      <SubmitMessage state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Linked listing">
          <select name="place_id" required className={inputClass()}>
            <option value="">Choose listing</option>
            {placeOptions.map((listing) => (
              <option key={listing.place_id} value={listing.place_id}>
                {listing.place?.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Image type">
          <select name="type" defaultValue="gallery" className={inputClass()}>
            <option value="gallery">Gallery</option>
            <option value="hero">Hero</option>
            <option value="room">Room</option>
            <option value="food">Food</option>
            <option value="exterior">Exterior</option>
            <option value="activity">Activity</option>
            <option value="map">Map</option>
          </select>
        </Field>
        <Field label="Photo">
          <input name="file" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" required className={inputClass('py-2')} />
        </Field>
        <Field label="Alt text">
          <input name="alt" maxLength={240} className={inputClass()} />
        </Field>
      </div>
      <button
        type="submit"
        disabled={state.status === 'saving' || placeOptions.length === 0}
        className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-5 text-sm font-bold leading-5 text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state.status === 'saving' ? 'Uploading...' : 'Upload photo'}
      </button>
    </form>
  )
}
