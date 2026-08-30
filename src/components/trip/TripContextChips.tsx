'use client'

/**
 * TripContextChips — persistent chip strip above chat when ?trip=<id>.
 *
 * Renders four chips with current trip values:
 *   - Island   (one of 10 mobile-canonical islands, photo picker)
 *   - Dates    (start + end date inputs, or "Flexible")
 *   - Who      (party_type + party_size)
 *   - Budget   (radio: any / $ / $$ / $$$ / $$$$)
 *
 * Tapping any chip opens a focused modal. Save → PATCH the trips row →
 * local state updates. No page reload required.
 *
 * Imagery-first: the Island chip shows the island's hero photo as a
 * small circular thumbnail in front of the name, so the chip strip
 * carries visual identity even at small sizes.
 *
 * Design borrowed from MindTrip's top bar but localized to our 4
 * editable fields (we don't have a separate Preferences column yet
 * — that's deferred).
 */

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  ISLAND_CONFIGS,
  getIslandHeroImage,
} from '@/lib/island-config'
import { BahaDateRangePicker } from '@/components/ui'
import type { IslandConfig } from '@/lib/island-config'
import type { Trip } from '@/types/database'

interface TripContextChipsProps {
  tripId: string
}

type ActiveEditor = 'island' | 'dates' | 'who' | 'budget' | null

// Tier mapping for the Budget chip — single numeric column requires
// us to pick a representative value per tier. These are intentionally
// round so they read as estimates, not commitments.
const BUDGET_TIERS: { label: string; symbol: string; value: number | null }[] = [
  { label: 'Any budget', symbol: '', value: null },
  { label: 'On a budget', symbol: '$', value: 1500 },
  { label: 'Sensibly priced', symbol: '$$', value: 3500 },
  { label: 'Upscale', symbol: '$$$', value: 7500 },
  { label: 'Luxury', symbol: '$$$$', value: 15000 },
]

const PARTY_TYPES: { value: string; label: string }[] = [
  { value: 'solo', label: 'Solo' },
  { value: 'couple', label: 'Couple' },
  { value: 'family', label: 'Family' },
  { value: 'friends', label: 'Friends' },
  { value: 'group', label: 'Group' },
]

/** Find an IslandConfig by display name (used to convert trips.islands[0] → config). */
function islandByName(name: string | undefined): IslandConfig | null {
  if (!name) return null
  return ISLAND_CONFIGS.find(i => i.name === name) ?? null
}

/** Find the BUDGET_TIERS entry that best matches a numeric budget. */
function tierForBudget(budget: number | null | undefined): typeof BUDGET_TIERS[number] {
  if (!budget) return BUDGET_TIERS[0]
  let bestIdx = 0
  let bestDelta = Infinity
  for (let i = 1; i < BUDGET_TIERS.length; i++) {
    const value = BUDGET_TIERS[i].value
    if (value == null) continue
    const delta = Math.abs(value - budget)
    if (delta < bestDelta) {
      bestDelta = delta
      bestIdx = i
    }
  }
  return BUDGET_TIERS[bestIdx]
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return 'Flexible'
  const fmt = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return `From ${fmt(start)}`
  return `Until ${fmt(end!)}`
}

export default function TripContextChips({ tripId }: TripContextChipsProps) {
  const supabase = createClient()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [active, setActive] = useState<ActiveEditor>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initial fetch
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .maybeSingle()
      if (!cancelled && data) setTrip(data as Trip)
    })()
    return () => { cancelled = true }
  }, [supabase, tripId])

  const patchTrip = useCallback(async (payload: Record<string, unknown>) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${tripId}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Could not save')
        return
      }
      setTrip(json.trip as Trip)
      setActive(null)
    } catch (e) {
      console.error('[TripContextChips] patch failed', e)
      setError('Network hiccup. Try again?')
    } finally {
      setSaving(false)
    }
  }, [tripId])

  if (!trip) {
    // Skeleton — keep dimensions stable to avoid layout shift when trip loads
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-white overflow-x-auto" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-24 rounded-full bg-gray-100 animate-pulse motion-reduce:animate-none" />
        ))}
      </div>
    )
  }

  const islandConfig = islandByName(trip.islands?.[0])
  const dateLabel = formatDateRange(trip.date_start, trip.date_end)
  const whoLabel = `${trip.party_size ?? 1} ${(trip.party_type ?? 'solo').toLowerCase()}`
  const budgetTier = tierForBudget(trip.budget_estimate)
  const budgetLabel = budgetTier.value == null ? 'Any budget' : budgetTier.symbol

  return (
    <>
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-white overflow-x-auto"
        role="group"
        aria-label="Trip context"
      >
        {/* Island chip — with photo thumbnail */}
        <ContextChip
          onClick={() => setActive('island')}
          label={islandConfig?.name ?? trip.islands?.[0] ?? 'Pick island'}
          leading={
            islandConfig ? (
              <span className="relative w-5 h-5 rounded-md overflow-hidden ring-1 ring-white shrink-0">
                <Image src={getIslandHeroImage(islandConfig)} alt="" fill sizes="20px" className="object-cover" />
              </span>
            ) : (
              <PinIcon />
            )
          }
        />
        <ContextChip
          onClick={() => setActive('dates')}
          label={dateLabel}
          leading={<CalendarIcon />}
        />
        <ContextChip
          onClick={() => setActive('who')}
          label={whoLabel}
          leading={<UsersIcon />}
        />
        <ContextChip
          onClick={() => setActive('budget')}
          label={budgetLabel || 'Budget'}
          leading={<WalletIcon />}
        />
      </div>

      {active === 'island' && (
        <IslandEditor
          currentIslandName={trip.islands?.[0]}
          saving={saving}
          error={error}
          onCancel={() => setActive(null)}
          onSave={(island) => patchTrip({
            islands: [island.name],
            hero_image_url: getIslandHeroImage(island),
          })}
        />
      )}
      {active === 'dates' && (
        <DatesEditor
          dateStart={trip.date_start}
          dateEnd={trip.date_end}
          saving={saving}
          error={error}
          onCancel={() => setActive(null)}
          onSave={(start, end) => patchTrip({ date_start: start, date_end: end })}
        />
      )}
      {active === 'who' && (
        <WhoEditor
          partyType={trip.party_type ?? 'solo'}
          partySize={trip.party_size ?? 1}
          saving={saving}
          error={error}
          onCancel={() => setActive(null)}
          onSave={(party_type, party_size) => patchTrip({ party_type, party_size })}
        />
      )}
      {active === 'budget' && (
        <BudgetEditor
          currentBudget={trip.budget_estimate}
          saving={saving}
          error={error}
          onCancel={() => setActive(null)}
          onSave={(budget_estimate) => patchTrip({ budget_estimate })}
        />
      )}
    </>
  )
}

// ───── ContextChip ─────────────────────────────────────────────────────────

function ContextChip({
  onClick,
  label,
  leading,
}: {
  onClick: () => void
  label: string
  leading: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-1 pl-1.5 pr-3 text-xs font-semibold text-night transition-colors hover:border-brand-600 hover:bg-brand-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 shrink-0"
    >
      {leading}
      <span className="max-w-[120px] truncate">{label}</span>
    </button>
  )
}

// ───── Shared modal shell ───────────────────────────────────────────────

function ChipModal({
  title,
  subtitle,
  onCancel,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  onCancel: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-baha-lg shadow-card-hover w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up motion-reduce:animate-none">
        <header className="flex items-center justify-between px-5 pt-5 pb-2">
          <div>
            <h3 className="text-lg font-bold text-night leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-night flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="px-5 py-3">{children}</div>
        <div className="px-5 pb-5 pt-2">{footer}</div>
      </div>
    </div>
  )
}

function SaveButton({ saving, disabled, onClick, label = 'Update' }: {
  saving: boolean; disabled?: boolean; onClick: () => void; label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
    >
      {saving ? (
        'Saving...'
      ) : (
        <>
          {label}
        </>
      )}
    </button>
  )
}

function ErrorRow({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div role="alert" className="bg-coral-50 border border-coral-200 text-coral-700 text-xs rounded-baha-md px-3 py-2 mb-2">
      {error}
    </div>
  )
}

// ───── Island editor ────────────────────────────────────────────────────

function IslandEditor({
  currentIslandName,
  saving,
  error,
  onCancel,
  onSave,
}: {
  currentIslandName: string | undefined
  saving: boolean
  error: string | null
  onCancel: () => void
  onSave: (island: IslandConfig) => void
}) {
  const initial = islandByName(currentIslandName)?.slug ?? ''
  const [slug, setSlug] = useState<string>(initial)
  const selected = ISLAND_CONFIGS.find(i => i.slug === slug) ?? null

  return (
    <ChipModal
      title="Destination"
      subtitle="Where are you headed?"
      onCancel={onCancel}
      footer={
        <>
          <ErrorRow error={error} />
          <SaveButton
            saving={saving}
            disabled={!selected || selected.name === currentIslandName}
            onClick={() => selected && onSave(selected)}
          />
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {ISLAND_CONFIGS.map((island) => {
          const active = island.slug === slug
          return (
            <button
              key={island.slug}
              type="button"
              onClick={() => setSlug(island.slug)}
              aria-pressed={active}
              className={`relative h-20 rounded-baha-md overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                active ? 'border-brand-600 shadow-card' : 'border-transparent hover:shadow-card'
              }`}
            >
              <Image src={getIslandHeroImage(island)} alt="" fill sizes="160px" className="object-cover" />
              <div className={`absolute inset-0 ${active ? 'bg-brand-700/45' : 'bg-night/40'}`} aria-hidden="true" />
              <span className="absolute inset-0 flex items-end p-2 text-white text-xs font-bold text-left drop-shadow">
                {island.name}
              </span>
            </button>
          )
        })}
      </div>
    </ChipModal>
  )
}

// ───── Dates editor ─────────────────────────────────────────────────────

function DatesEditor({
  dateStart,
  dateEnd,
  saving,
  error,
  onCancel,
  onSave,
}: {
  dateStart: string | null | undefined
  dateEnd: string | null | undefined
  saving: boolean
  error: string | null
  onCancel: () => void
  onSave: (start: string | null, end: string | null) => void
}) {
  const [start, setStart] = useState<string>(dateStart ?? '')
  const [end, setEnd] = useState<string>(dateEnd ?? '')
  const isFlexible = !start && !end

  return (
    <ChipModal
      title="Travel dates"
      subtitle="Or leave both empty for flexible."
      onCancel={onCancel}
      footer={
        <>
          <ErrorRow error={error} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSave(null, null)}
              disabled={saving || isFlexible}
              className="flex-1 rounded-full border border-gray-200 bg-white py-2.5 font-bold text-night transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Flexible
            </button>
            <SaveButton
              saving={saving}
              disabled={!start && !end}
              onClick={() => onSave(start || null, end || null)}
            />
          </div>
        </>
      }
    >
      <BahaDateRangePicker
        layout="inline"
        start={start}
        end={end}
        onChange={(s, e) => {
          setStart(s)
          setEnd(e)
        }}
        placeholder="Check-in – Check-out"
      />
    </ChipModal>
  )
}

// ───── Who editor ───────────────────────────────────────────────────────

function WhoEditor({
  partyType,
  partySize,
  saving,
  error,
  onCancel,
  onSave,
}: {
  partyType: string
  partySize: number
  saving: boolean
  error: string | null
  onCancel: () => void
  onSave: (party_type: string, party_size: number) => void
}) {
  const [type, setType] = useState<string>(partyType)
  const [size, setSize] = useState<number>(partySize)
  const dirty = type !== partyType || size !== partySize

  return (
    <ChipModal
      title="Who's going?"
      onCancel={onCancel}
      footer={
        <>
          <ErrorRow error={error} />
          <SaveButton saving={saving} disabled={!dirty} onClick={() => onSave(type, size)} />
        </>
      }
    >
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">Party type</p>
        <div className="flex flex-wrap gap-2">
          {PARTY_TYPES.map((p) => {
            const active = p.value === type
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setType(p.value)}
                aria-pressed={active}
                className={`px-4 py-1.5 rounded-full border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                  active
                    ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                    : 'border-gray-300 bg-white text-night hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-night">Travelers</p>
          <p className="text-xs text-gray-500">Total people on the trip</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSize((s) => Math.max(1, s - 1))}
            aria-label="Decrease travelers"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-night transition-colors hover:border-brand-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <span className="w-6 text-center font-bold text-night">{size}</span>
          <button
            type="button"
            onClick={() => setSize((s) => Math.min(20, s + 1))}
            aria-label="Increase travelers"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-night transition-colors hover:border-brand-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </ChipModal>
  )
}

// ───── Budget editor ────────────────────────────────────────────────────

function BudgetEditor({
  currentBudget,
  saving,
  error,
  onCancel,
  onSave,
}: {
  currentBudget: number | null | undefined
  saving: boolean
  error: string | null
  onCancel: () => void
  onSave: (budget_estimate: number | null) => void
}) {
  const currentTier = tierForBudget(currentBudget)
  const [tierIdx, setTierIdx] = useState<number>(BUDGET_TIERS.indexOf(currentTier))

  return (
    <ChipModal
      title="Budget"
      subtitle="Select your budget range"
      onCancel={onCancel}
      footer={
        <>
          <ErrorRow error={error} />
          <SaveButton
            saving={saving}
            disabled={tierIdx === BUDGET_TIERS.indexOf(currentTier)}
            onClick={() => onSave(BUDGET_TIERS[tierIdx].value)}
          />
        </>
      }
    >
      <ul className="space-y-2">
        {BUDGET_TIERS.map((tier, i) => {
          const active = i === tierIdx
          return (
            <li key={tier.label}>
              <button
                type="button"
                onClick={() => setTierIdx(i)}
                aria-pressed={active}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-baha-md border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                  active ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <span className="font-bold text-sm text-night w-12 shrink-0">{tier.symbol || '—'}</span>
                <span className="text-sm text-night">{tier.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </ChipModal>
  )
}

// ───── Icons ────────────────────────────────────────────────────────────

function PinIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 10v8a2 2 0 002 2h14a2 2 0 002-2v-8M3 10V6a2 2 0 012-2h14a2 2 0 012 2v4M16 14h.01" />
    </svg>
  )
}
