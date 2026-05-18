'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
}

export default function OnboardingFlow({ userId, defaultName }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
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
      if (homeAirport.trim()) updates.home_airport = homeAirport.trim().toUpperCase()

      const { error: dbError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)

      if (dbError) throw dbError
      router.push('/dashboard')
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
          <span className="text-xs text-gray-400 font-medium">Step {step} of 3</span>
          <button
            onClick={() => { void handleComplete() }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip for now
          </button>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 flex flex-col px-4 py-8 max-w-lg mx-auto w-full">
        {step === 1 && (
          <Step1Name name={name} onChange={setName} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <Step2Interests interests={interests} onToggle={toggleInterest} onBack={() => setStep(1)} onNext={() => setStep(3)} />
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
          />
        )}
      </div>
    </div>
  )
}

// ─── Step 1: Name ─────────────────────────────────────────────────────────────

function Step1Name({ name, onChange, onNext }: {
  name: string
  onChange: (v: string) => void
  onNext: () => void
}) {
  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Welcome to Baha Buddy!</h1>
        <p className="text-gray-500">Let&apos;s personalize your Bahamas experience. First — what should we call you?</p>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Your first name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Maria"
          autoFocus
          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-400 transition-colors"
        />
      </div>

      <button
        onClick={onNext}
        disabled={!name.trim()}
        className="w-full bg-brand-500 disabled:bg-gray-200 disabled:text-gray-400 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl text-base transition-colors"
      >
        Continue →
      </button>
    </div>
  )
}

// ─── Step 2: Interests ────────────────────────────────────────────────────────

function Step2Interests({ interests, onToggle, onBack, onNext }: {
  interests: string[]
  onToggle: (id: string) => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">What&apos;s your travel vibe?</h2>
        <p className="text-gray-500 text-sm">Pick everything that resonates — we&apos;ll tailor your recommendations.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {INTERESTS.map((item) => {
          const selected = interests.includes(item.id)
          return (
            <button
              key={item.id}
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
              {selected && <span className="ml-auto text-brand-500 text-sm">✓</span>}
            </button>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-4 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-base hover:bg-gray-50 transition-colors"
        >
          ←
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl text-base transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Party type + home airport ───────────────────────────────────────

function Step3Details({ partyType, homeAirport, onPartyType, onHomeAirport, onBack, onComplete, saving, error }: {
  partyType: string
  homeAirport: string
  onPartyType: (v: string) => void
  onHomeAirport: (v: string) => void
  onBack: () => void
  onComplete: () => void
  saving: boolean
  error: string | null
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Who are you traveling with?</h2>
        <p className="text-gray-500 text-sm">This helps Buddy find the right deals and activities for you.</p>
      </div>

      {/* Party type */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Typical travel party</label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {PARTY_TYPES.map((pt) => (
            <button
              key={pt.id}
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
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Home airport <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={homeAirport}
          onChange={(e) => onHomeAirport(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="e.g. MIA"
          maxLength={3}
          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-400 transition-colors"
        />
        <p className="text-xs text-gray-400 mt-1.5">3-letter IATA airport code — helps us find the best flights to the Bahamas.</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-4 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-base hover:bg-gray-50 transition-colors"
        >
          ←
        </button>
        <button
          onClick={onComplete}
          disabled={saving}
          className="flex-1 bg-brand-500 disabled:bg-brand-300 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl text-base transition-colors"
        >
          {saving ? 'Saving…' : "Let's go!"}
        </button>
      </div>
    </div>
  )
}
