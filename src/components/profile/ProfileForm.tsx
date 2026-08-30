'use client'

/**
 * ProfileForm — editable form for the /profile page.
 *
 * Receives the initial profile state as props (server-fetched), tracks
 * dirty state locally, and calls the updateProfile server action on save.
 *
 * Fields covered (per UI/UX Spec §8):
 *   - Display name
 *   - City + country
 *   - Party type (radiogroup of tappable tiles)
 *   - Party size (number)
 *   - Children count (only when party_type === 'family')
 *   - Interest tags (10 vibe categories, multi-select)
 *
 * Out of scope for C.4 (will come in D polish or as separate sections):
 *   - Email change
 *   - Password change
 *   - Dietary needs / accessibility needs
 *   - Notification preferences
 *   - Voice settings
 *
 * D.9.8 a11y:
 *   - Party-type tiles use `role="radiogroup"` + `role="radio"` +
 *     `aria-checked` so screen readers announce them as a single-select
 *     group. Roving tabindex keeps keyboard nav predictable: only the
 *     selected tile is in the tab order (tabIndex=0), others use
 *     tabIndex=-1 and respond to arrow keys.
 *   - Interest-tags group wrapped in `role="group" aria-label` so the
 *     multi-select intent is announced.
 *   - Save status (idle/dirty/success/error) lives in an aria-live
 *     polite region so changes are announced.
 *   - The "saved" success message uses `role="status"` per ARIA spec.
 *
 * Mobile reference: lib/features/profile/screens/profile_screen.dart
 */

import { useId, useRef, useState, useTransition } from 'react'
import { PARTY_TYPES, INTEREST_TAGS, type InterestSlug } from '@/lib/profile-options'
import { updateProfile, type UpdateProfileInput } from '@/app/(dashboard)/profile/actions'

export interface ProfileFormProps {
  initial: {
    display_name: string
    city: string
    country: string
    party_type: string
    party_size: number
    children_count: number
    interest_tags: string[]
  }
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export default function ProfileForm({ initial }: ProfileFormProps) {
  const partyGroupId = useId()
  const interestsGroupId = useId()

  const [displayName, setDisplayName] = useState(initial.display_name)
  const [city, setCity] = useState(initial.city)
  const [country, setCountry] = useState(initial.country)
  const [partyType, setPartyType] = useState(initial.party_type || 'solo')
  const [partySize, setPartySize] = useState(initial.party_size || 1)
  const [childrenCount, setChildrenCount] = useState(initial.children_count || 0)
  const [interests, setInterests] = useState<string[]>(initial.interest_tags || [])

  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' })

  // Refs for the party-type radio tiles, used for arrow-key roving focus.
  const partyTileRefs = useRef<Array<HTMLButtonElement | null>>([])

  const clearStatusOnEdit = () => {
    if (status.type !== 'idle') {
      setStatus({ type: 'idle' })
    }
  }

  const toggleInterest = (slug: InterestSlug) => {
    clearStatusOnEdit()
    setInterests(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug],
    )
  }

  /** ARIA radiogroup keyboard nav: ←↑ previous, →↓ next, Home first, End last. */
  const onPartyKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const last = PARTY_TYPES.length - 1
    let next = currentIndex
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = currentIndex === last ? 0 : currentIndex + 1
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = currentIndex === 0 ? last : currentIndex - 1
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = last
        break
      default:
        return
    }
    e.preventDefault()
    clearStatusOnEdit()
    setPartyType(PARTY_TYPES[next].value)
    partyTileRefs.current[next]?.focus()
  }

  const isDirty =
    displayName !== initial.display_name ||
    city !== initial.city ||
    country !== initial.country ||
    partyType !== initial.party_type ||
    partySize !== initial.party_size ||
    childrenCount !== initial.children_count ||
    !arraysEqualUnordered(interests, initial.interest_tags)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDirty || isPending) return

    const validationError = validateProfileDraft({
      displayName,
      partySize,
      childrenCount,
      partyType,
      interests,
    })
    if (validationError) {
      setStatus({ type: 'error', message: validationError })
      return
    }

    const payload: UpdateProfileInput = {
      display_name:   displayName,
      city:           city,
      country:        country,
      party_type:     partyType,
      party_size:     partySize,
      children_count: partyType === 'family' ? childrenCount : 0,
      interest_tags:  interests,
    }

    startTransition(async () => {
      setStatus({ type: 'idle' })
      const result = await updateProfile(payload)
      if (result.success) {
        setStatus({ type: 'success', message: 'Saved!' })
        setTimeout(() => setStatus({ type: 'idle' }), 2500)
      } else {
        setStatus({ type: 'error', message: result.error || 'Could not save changes.' })
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" aria-label="Edit profile" noValidate>
      {/* ── About you ──────────────────────────────────────────────── */}
      <Section title="About you" hint="How Buddy refers to you in chat.">
        <Field label="Display name" htmlFor="display_name">
          <input
            id="display_name"
            type="text"
            value={displayName}
            onChange={e => {
              clearStatusOnEdit()
              setDisplayName(e.target.value)
            }}
            maxLength={80}
            required
            aria-required="true"
            className={INPUT_CLS}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="City" htmlFor="city">
            <input
              id="city"
              type="text"
              value={city}
              onChange={e => {
                clearStatusOnEdit()
                setCity(e.target.value)
              }}
              placeholder="Miami"
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Country" htmlFor="country">
            <input
              id="country"
              type="text"
              value={country}
              onChange={e => {
                clearStatusOnEdit()
                setCountry(e.target.value)
              }}
              placeholder="United States"
              className={INPUT_CLS}
            />
          </Field>
        </div>
      </Section>

      {/* ── How you travel ──────────────────────────────────────────── */}
      <Section title="How you travel" hint="Helps Buddy size hotels and tailor recommendations.">
        <div>
          <label
            id={`${partyGroupId}-label`}
            className="block text-xs font-semibold text-gray-700 uppercase mb-1.5"
          >
            Travel party
          </label>
          <div
            role="radiogroup"
            aria-labelledby={`${partyGroupId}-label`}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
          >
            {PARTY_TYPES.map((opt, idx) => {
              const selected = partyType === opt.value
              return (
                <button
                  key={opt.value}
                  ref={el => { partyTileRefs.current[idx] = el }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => {
                    clearStatusOnEdit()
                    setPartyType(opt.value)
                  }}
                  onKeyDown={(e) => onPartyKeyDown(e, idx)}
                  className={cn(
                    'px-3 py-3 rounded-baha-md border-2 text-sm font-semibold transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
                    selected
                      ? 'border-night bg-gray-50 text-night'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className={cn('grid gap-4', partyType === 'family' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
          <Field label="Party size" htmlFor="party_size">
            <input
              id="party_size"
              type="number"
              min={1}
              max={20}
              value={partySize}
              onChange={e => {
                clearStatusOnEdit()
                setPartySize(Math.max(1, parseInt(e.target.value, 10) || 1))
              }}
              className={INPUT_CLS}
            />
          </Field>
          {partyType === 'family' && (
            <Field label="Number of children" htmlFor="children_count">
              <input
                id="children_count"
                type="number"
                min={0}
                max={10}
                value={childrenCount}
                onChange={e => {
                  clearStatusOnEdit()
                  setChildrenCount(Math.max(0, parseInt(e.target.value, 10) || 0))
                }}
                className={INPUT_CLS}
              />
            </Field>
          )}
        </div>
      </Section>

      {/* ── What gets you excited ───────────────────────────────────── */}
      <Section title="What gets you excited" hint="Buddy uses these to surface the right places and vibes.">
        <div>
          <span id={`${interestsGroupId}-label`} className="sr-only">
            Travel interests — pick all that apply
          </span>
          <div
            role="group"
            aria-labelledby={`${interestsGroupId}-label`}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5"
          >
            {INTEREST_TAGS.map(({ slug, label }) => {
              const selected = interests.includes(slug)
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggleInterest(slug)}
                  aria-pressed={selected}
                  aria-label={`${label}${selected ? ', selected' : ''}`}
                  className={cn(
                    'flex items-center justify-center py-3 px-2 rounded-baha-md border-2 transition-all duration-200 text-center min-h-[3.25rem]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
                    selected
                      ? 'border-night bg-gray-50 text-night'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                  )}
                >
                  <span className="text-xs font-semibold leading-tight">{label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3" aria-live="polite">
          Selected {interests.length} of {INTEREST_TAGS.length}
        </p>
      </Section>

      {/* ── Save bar ────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-200 -mx-4 sm:mx-0 sm:rounded-baha-md sm:border sm:shadow-card px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="text-xs" aria-live="polite">
          {status.type === 'success' && (
            <span role="status" className="inline-flex items-center gap-1.5 text-palm-700 font-semibold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {status.message}
            </span>
          )}
          {status.type === 'error' && (
            <span role="alert" className="text-coral-600 font-semibold">{status.message}</span>
          )}
          {status.type === 'idle' && isDirty && (
            <span className="text-gray-500">You have unsaved changes</span>
          )}
        </div>
        <button
          type="submit"
          disabled={!isDirty || isPending}
          aria-disabled={!isDirty || isPending}
          className={cn(
            'inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700',
            'disabled:cursor-not-allowed disabled:bg-brand-600 disabled:opacity-40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2',
          )}
        >

          {isPending ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

const INPUT_CLS =
  'w-full rounded-baha-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-night placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-night transition-colors'

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <header className="mb-4">
        <h2 className="text-lg font-bold text-night">{title}</h2>
        {hint && <p className="text-sm text-gray-500 mt-0.5">{hint}</p>}
      </header>
      <div className="space-y-4 bg-white rounded-baha-md border border-gray-200 p-5 shadow-soft">
        {children}
      </div>
    </section>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function arraysEqualUnordered<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every(x => set.has(x))
}

function validateProfileDraft({
  displayName,
  partySize,
  childrenCount,
  partyType,
  interests,
}: {
  displayName: string
  partySize: number
  childrenCount: number
  partyType: string
  interests: string[]
}): string | null {
  const trimmedName = displayName.trim()
  if (!trimmedName || trimmedName.length > 80) return 'Display name must be 1-80 characters.'
  if (partySize < 1 || partySize > 20) return 'Party size must be between 1 and 20.'
  if (partyType === 'family' && (childrenCount < 0 || childrenCount > 10)) {
    return 'Children count must be between 0 and 10.'
  }
  if (!Array.isArray(interests)) return 'Invalid interests payload.'
  return null
}
