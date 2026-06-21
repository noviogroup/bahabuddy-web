'use client'

/* eslint-disable @next/next/no-img-element -- archived pre-C4 snapshot, not active runtime UI */

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { BuddyAvatar } from '@/components/ui'

const BAHAMAS_ISLANDS = [
  'Nassau / New Providence',
  'Paradise Island',
  'Grand Bahama',
  'Exuma',
  'Eleuthera',
  'Harbour Island',
  'Abaco',
  'Bimini',
  'Andros',
  'Long Island',
  'Cat Island',
  'San Salvador',
]

const PARTY_TYPES = [
  { value: 'solo', label: 'Solo' },
  { value: 'couple', label: 'Couple' },
  { value: 'family', label: 'Family' },
  { value: 'friends', label: 'Friends' },
]

interface ProfileData {
  display_name: string
  email: string | null
  avatar_url: string | null
  party_type: string
  party_size: number
  city: string | null
  country: string | null
  interest_tags: string[] | null
  dietary_needs: string[] | null
  accessibility_needs: string[] | null
}

interface Props {
  profile: ProfileData
  userEmail: string
}

export default function ProfileForm({ profile, userEmail }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [partyType, setPartyType] = useState(profile.party_type ?? 'solo')
  const [partySize, setPartySize] = useState(profile.party_size ?? 1)
  const [city, setCity] = useState(profile.city ?? '')
  const [country, setCountry] = useState(profile.country ?? '')
  const [favoriteIslands, setFavoriteIslands] = useState<string[]>(profile.interest_tags ?? [])

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const initials = (displayName || userEmail || '?')
    .split(' ')
    .map(s => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  function toggleIsland(island: string) {
    setFavoriteIslands(prev =>
      prev.includes(island) ? prev.filter(i => i !== island) : [...prev, island]
    )
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim() || undefined,
          party_type: partyType,
          party_size: partySize,
          city: city.trim() || null,
          country: country.trim() || null,
          interest_tags: favoriteIslands,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }

      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Account Info */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Account Info</h2>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <BuddyAvatar size="md" state="idle" className="!w-16 !h-16" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">{userEmail}</p>
            <p className="text-xs text-gray-400 mt-0.5">Manage your account info below</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setSaved(false) }}
              placeholder="Your name"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email is managed by your auth provider</p>
          </div>
        </div>
      </section>

      {/* Travel Preferences */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Travel Preferences</h2>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Travel Style
              </label>
              <select
                value={partyType}
                onChange={e => { setPartyType(e.target.value); setSaved(false) }}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                {PARTY_TYPES.map(pt => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Party Size
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={e => { setPartySize(parseInt(e.target.value, 10) || 1); setSaved(false) }}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Home City
              </label>
              <input
                type="text"
                value={city}
                onChange={e => { setCity(e.target.value); setSaved(false) }}
                placeholder="e.g. Miami"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={e => { setCountry(e.target.value); setSaved(false) }}
                placeholder="e.g. United States"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Favorite Islands
            </label>
            <div className="flex flex-wrap gap-2">
              {BAHAMAS_ISLANDS.map(island => {
                const selected = favoriteIslands.includes(island)
                return (
                  <button
                    key={island}
                    type="button"
                    onClick={() => toggleIsland(island)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      selected
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-700'
                    }`}
                  >
                    {island}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>

      {/* Quick Links */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Links</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl px-4 py-2.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            My Trips
          </Link>
          <Link
            href="/dashboard/chat"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl px-4 py-2.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Chat with Buddy
          </Link>
        </div>
      </section>

      {/* Settings */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Push Notifications</p>
              <p className="text-xs text-gray-400 mt-0.5">Trip reminders and Baha Buddy tips</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              Mobile only
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Sign Out</p>
              <p className="text-xs text-gray-400 mt-0.5">Sign out of your Baha Buddy account</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>
    </form>
  )
}
