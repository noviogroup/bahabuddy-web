'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TravelSearchCombobox from '@/components/marketplace/TravelSearchCombobox'
import { ORIGIN_AIRPORT_OPTIONS, resolveAirportCode } from '@/lib/airports'
import { safeRelativePath } from '@/lib/safe-redirect'

// ─── Step data ───────────────────────────────────────────────────────────────

const INTERESTS = [
  { id: 'adventure', label: 'Adventure' },
  { id: 'relaxation', label: 'Relaxation' },
  { id: 'romance', label: 'Romance' },
  { id: 'family', label: 'Family' },
  { id: 'food', label: 'Food & Drink' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'culture', label: 'Culture' },
  { id: 'water sports', label: 'Water Sports' },
]

const PARTY_TYPES = [
  { id: 'solo', label: 'Solo' },
  { id: 'couple', label: 'Couple' },
  { id: 'friends', label: 'Friends' },
  { id: 'family', label: 'Family' },
  { id: 'group', label: 'Group' },
]

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  userId: string
  defaultName?: string
  /** Post-onboarding destination (already sanitised server-side). */
  next?: string
}

const FALLBACK_DISPLAY_NAME = 'Traveler'

export default function OnboardingFlow({ userId, defaultName, next }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const isFirstRender = useRef(true)

  // Move focus to the new step's heading so screen readers announce it.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Name
  const [name, setName] = useState(defaultName ?? '')

  // Step 2: Interests
  const [interests, setInterests] = useState<string[]>([])

  // Step 3: Party type + home airport
  const [partyType, setPartyType] = useState('')
  const [homeAirport, setHomeAirport] = useState('')

  const progress = step / 3

  function toggleInterest(id: string) {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  async function handleComplete() {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const updates: Record<string, unknown> = {
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }
      if (name.trim()) updates.display_name = name.trim()
      if (interests.length > 0) updates.interest_tags = interests
      if (partyType) updates.party_type = partyType
      if (homeAirport.trim()) {
        updates.home_airport = resolveAirportCode(homeAirport) ?? homeAirport.trim().toUpperCase()
      }

      const { data: updatedRows, error: dbError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select('id')

      if (dbError) throw dbError

      // No profile row yet (signup trigger did not create one): create it so
      // onboarding is not silently lost. display_name is NOT NULL.
      if (!updatedRows || updatedRows.length === 0) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            display_name: name.trim() || FALLBACK_DISPLAY_NAME,
            ...updates,
          })
        if (insertError) throw insertError
      }

      router.push(safeRelativePath(next))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col">
      {/* Progress */}
      <div className="px-4 pt-8 pb-0 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600 font-medium">Step {step} of 3</span>
          <button
            type="button"
            onClick={() => { void handleComplete() }}
            className="text-xs text-gray-600 hover:text-gray-800 underline-offset-2 hover:underline transition-colors"
          >
            Skip for now
          </button>
        </div>
        <div
          className="h-1.5 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
        >
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 flex flex-col px-4 py-8 max-w-lg mx-auto w-full">
        {step === 1 && (
          <Step1Name name={name} onChange={setName} onNext={() => setStep(2)} headingRef={headingRef} />
        )}
        {step === 2 && (
          <Step2Interests interests={interests} onToggle={toggleInterest} onBack={() => setStep(1)} onNext={() => setStep(3)} headingRef={headingRef} />
        )}
        {step === 3 && (
          <Step3Details
            partyType={partyType}
            homeAirport={homeAirport}
            onPartyType={setPartyType}
            onHomeAirport={setHomeAirport}
            onBack={() => setStep(2)}
            onComplete={handleComplete}
            saving={saving}
            error={error}
            headingRef={headingRef}
          />
        )}
        {/* Save errors from "Skip for now" on steps 1-2 would otherwise be invisible. */}
        {step !== 3 && error && (
          <div role="alert" className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step 1: Name ─────────────────────────────────────────────────────────────

type HeadingRef = React.RefObject<HTMLHeadingElement>

function Step1Name({ name, onChange, onNext, headingRef }: {
  name: string
  onChange: (v: string) => void
  onNext: () => void
  headingRef: HeadingRef
}) {
  return (
    <div>
      <div className="text-center mb-10">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none">Welcome to Baha Buddy!</h1>
        <p className="text-gray-600">Let&apos;s personalize your Bahamas experience. First — what should we call you?</p>
      </div>

      <div className="mb-8">
        <label htmlFor="onb-name" className="block text-sm font-semibold text-gray-700 mb-2">Your first name</label>
        <input
          id="onb-name"
          type="text"
          autoComplete="given-name"
          value={name}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Maria"
          autoFocus
          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-400 transition-colors"
        />
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!name.trim()}
        className="w-full bg-brand-600 disabled:bg-gray-200 disabled:text-gray-500 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl text-base transition-colors"
      >
        Continue →
      </button>
    </div>
  )
}

// ─── Step 2: Interests ────────────────────────────────────────────────────────

function Step2Interests({ interests, onToggle, onBack, onNext, headingRef }: {
  interests: string[]
  onToggle: (id: string) => void
  onBack: () => void
  onNext: () => void
  headingRef: HeadingRef
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 ref={headingRef} tabIndex={-1} id="onb-interests-heading" className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none">What&apos;s your travel vibe?</h2>
        <p className="text-gray-600 text-sm">Pick everything that resonates — we&apos;ll tailor your recommendations.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8" role="group" aria-labelledby="onb-interests-heading">
        {INTERESTS.map((item) => {
          const selected = interests.includes(item.id)
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(item.id)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                selected
                  ? 'bg-brand-50 border-brand-400 ring-2 ring-brand-400/30'
                  : 'bg-white border-gray-200 hover:border-brand-200'
              }`}
            >
              <span className={`text-sm font-semibold ${selected ? 'text-brand-700' : 'text-gray-700'}`}>
                {item.label}
              </span>
              {selected && (
                <svg className="ml-auto h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="px-6 py-4 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-base hover:bg-gray-50 transition-colors"
        >
          ←
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl text-base transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Party type + home airport ───────────────────────────────────────

function Step3Details({ partyType, homeAirport, onPartyType, onHomeAirport, onBack, onComplete, saving, error, headingRef }: {
  partyType: string
  homeAirport: string
  onPartyType: (v: string) => void
  onHomeAirport: (v: string) => void
  onBack: () => void
  onComplete: () => void
  saving: boolean
  error: string | null
  headingRef: HeadingRef
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none">Who are you traveling with?</h2>
        <p className="text-gray-600 text-sm">This helps Buddy find the right deals and activities for you.</p>
      </div>

      {/* Party type */}
      <div className="mb-6">
        <p id="onb-party-label" className="block text-sm font-semibold text-gray-700 mb-3">Typical travel party</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-labelledby="onb-party-label">
          {PARTY_TYPES.map((pt) => (
            <button
              key={pt.id}
              type="button"
              role="radio"
              aria-checked={partyType === pt.id}
              onClick={() => onPartyType(pt.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                partyType === pt.id
                  ? 'bg-brand-50 border-brand-400 ring-2 ring-brand-400/30'
                  : 'bg-white border-gray-200 hover:border-brand-200'
              }`}
            >
              <span className={`text-xs font-semibold ${partyType === pt.id ? 'text-brand-700' : 'text-gray-600'}`}>
                {pt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Home airport */}
      <div className="mb-8">
        <label htmlFor="home-airport" className="block text-sm font-semibold text-gray-700 mb-2">
          Home airport <span className="text-gray-600 font-normal">(optional)</span>
        </label>
        <TravelSearchCombobox
          id="home-airport"
          name="home_airport"
          value={homeAirport}
          onChange={onHomeAirport}
          options={ORIGIN_AIRPORT_OPTIONS}
          ariaLabel="Home airport"
          allowCustomValue
          placeholder="Miami, Atlanta, Toronto"
          emptyLabel="Type a city, airport, or 3-letter code"
          helperText="Search by city, airport, or code"
          customOptionLabel={(query) => `Use "${query}" as home airport`}
        />
        <p className="text-xs text-gray-600 mt-1.5">Search by city or airport. Baha Buddy saves the closest flight code for live Bahamas fare previews.</p>
      </div>

      {error && (
        <div role="alert" className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="px-6 py-4 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-base hover:bg-gray-50 transition-colors"
        >
          ←
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={saving}
          className="flex-1 bg-brand-600 disabled:bg-brand-300 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl text-base transition-colors"
        >
          {saving ? 'Saving…' : "Let's go!"}
        </button>
      </div>
    </div>
  )
}
