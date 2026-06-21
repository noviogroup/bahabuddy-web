'use client'

/**
 * CreateTripModal — the "Where to?" modal (MindTrip-pattern equivalent).
 *
 * Three fields, one screen:
 *   - Destination: 10 mobile-canonical islands shown as photo tiles
 *   - Timing:      Flexible toggle + optional start/end date pickers
 *   - Preferences: freeform text saved as planning context
 *
 * Imagery-first design (per Valdez's emphasis):
 *   - Left rail is a full-bleed real Bahamas photo, not a cartoon.
 *     Updates live as the user picks a destination.
 *   - Each destination tile is a real photo thumbnail + name overlay.
 *     Hover state lifts and brightens.
 *
 * On submit: server action inserts a draft trip row and returns its id.
 * We then open the canonical trip detail page. Buddy stays available as
 * a secondary planning workspace instead of being the default route.
 *
 * Accessibility: focus is trapped via dialog/aria-modal pattern; ESC
 * closes; the first input gets focus on open.
 */

import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ISLAND_CONFIGS, getIslandConfig, getIslandHeroImage } from '@/lib/island-config'
import { BahaImages } from '@/lib/baha-images'
import { createTripAction } from '@/app/actions/create-trip'
import { BahaDateRangePicker } from '@/components/ui'

interface CreateTripModalProps {
  open: boolean
  onClose: () => void
}

type Timing = 'flexible' | 'dates'

const MAX_PREFS = 2000

export default function CreateTripModal({ open, onClose }: CreateTripModalProps) {
  const router = useRouter()
  const titleId = useId()
  const prefsId = useId()
  const datesId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  const [destinationSlug, setDestinationSlug] = useState<string>('')
  const [timing, setTiming] = useState<Timing>('flexible')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [preferences, setPreferences] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal closes so the next open starts fresh.
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setDestinationSlug('')
        setTiming('flexible')
        setDateStart('')
        setDateEnd('')
        setPreferences('')
        setError(null)
        setSubmitting(false)
      }, 200)
    }
  }, [open])

  // ESC to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Initial focus
  useEffect(() => {
    if (open) {
      setTimeout(() => firstFocusRef.current?.focus(), 50)
    }
  }, [open])

  const selectedIsland = destinationSlug ? getIslandConfig(destinationSlug) : null

  // Imagery: left rail photo follows the selection so users see their
  // destination come to life as they pick. Falls back to a hero shot
  // of the Bahamas when nothing's selected.
  const railImage = selectedIsland
    ? getIslandHeroImage(selectedIsland)
    : BahaImages.bahamasLifestyle

  const canSubmit = Boolean(destinationSlug) && !submitting

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    const input = {
      destinationSlug,
      dateStart: timing === 'dates' && dateStart ? dateStart : null,
      dateEnd: timing === 'dates' && dateEnd ? dateEnd : null,
      preferences,
    }

    try {
      const result = await createTripAction(input)
      if (!result.ok || !result.tripId) {
        setError(result.error ?? 'Something went wrong. Try again?')
        setSubmitting(false)
        return
      }

      // Close modal optimistically then open the canonical trip record.
      onClose()
      router.push(`/trip/${encodeURIComponent(result.tripId)}`)
    } catch (e) {
      console.error('[CreateTripModal] submit failed', e)
      setError('Network hiccup. Mind trying that again?')
      setSubmitting(false)
    }
  }, [canSubmit, destinationSlug, timing, dateStart, dateEnd, preferences, onClose, router])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        // Click-outside to close
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-baha-lg shadow-card-hover w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col md:flex-row animate-slide-up motion-reduce:animate-none"
      >
        {/* Imagery rail — left on desktop, top on mobile.
            Real photo, not cartoon. Updates with destination selection. */}
        <div className="relative md:w-2/5 h-48 md:h-auto shrink-0 bg-brand-50">
          <Image
            src={railImage}
            alt={selectedIsland ? `${selectedIsland.name} photo` : 'The Bahamas'}
            fill
            sizes="(max-width: 768px) 100vw, 384px"
            className="object-cover"
            priority
          />
          {/* Soft gradient for legibility of overlaid text */}
          <div className="absolute inset-0 bg-gradient-to-t from-night/70 via-night/10 to-transparent" aria-hidden="true" />
          {/* Close button — overlays the imagery so it's always visible */}
          <button
            ref={firstFocusRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-night flex items-center justify-center shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Imagery caption — selected island name, or branding when empty */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {selectedIsland ? (
              <>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">Your destination</p>
                <p className="text-white text-2xl font-extrabold leading-tight drop-shadow">{selectedIsland.name}</p>
                <p className="text-white/90 text-xs mt-1 leading-relaxed line-clamp-2">{selectedIsland.tagline}</p>
              </>
            ) : (
              <>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">Baha Buddy</p>
                <p className="text-white text-2xl font-extrabold leading-tight drop-shadow">Your Bahamas, your way.</p>
              </>
            )}
          </div>
        </div>

        {/* Form rail */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          <h2 id={titleId} className="text-2xl font-extrabold text-night">Where to?</h2>
          <p className="text-sm text-gray-500 mt-1">Create the trip first, then add stays, flights, food, and tours directly.</p>

          {/* Destination */}
          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-night mb-2">Destination</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ISLAND_CONFIGS.map((island) => {
                const isActive = island.slug === destinationSlug
                return (
                  <button
                    key={island.slug}
                    type="button"
                    onClick={() => setDestinationSlug(island.slug)}
                    aria-pressed={isActive}
                    className={`relative h-20 rounded-baha-md overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ${
                      isActive
                        ? 'border-brand-600 shadow-card scale-[1.02]'
                        : 'border-transparent hover:scale-[1.02] hover:shadow-card'
                    }`}
                  >
                    {/* Real photo tile */}
                    <Image
                      src={getIslandHeroImage(island)}
                      alt=""
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                    <div className={`absolute inset-0 ${isActive ? 'bg-brand-700/45' : 'bg-night/40 hover:bg-night/30'} transition-colors`} aria-hidden="true" />
                    <span className="absolute inset-0 flex items-end p-2 text-white text-xs font-bold text-left leading-tight drop-shadow">
                      {island.name}
                    </span>
                    {isActive && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gold-400 text-night flex items-center justify-center shadow">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* Timing */}
          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-night mb-2">Timing</legend>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTiming('flexible')}
                aria-pressed={timing === 'flexible'}
                className={`flex-1 px-4 py-2.5 rounded-full border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ${
                  timing === 'flexible'
                    ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                    : 'border-gray-300 bg-white text-night hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                Flexible
              </button>
              <button
                type="button"
                onClick={() => setTiming('dates')}
                aria-pressed={timing === 'dates'}
                className={`flex-1 px-4 py-2.5 rounded-full border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ${
                  timing === 'dates'
                    ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                    : 'border-gray-300 bg-white text-night hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                Select dates
              </button>
            </div>
            {timing === 'dates' && (
              <BahaDateRangePicker
                id={datesId}
                layout="inline"
                start={dateStart}
                end={dateEnd}
                onChange={(start, end) => {
                  setDateStart(start)
                  setDateEnd(end)
                }}
                placeholder="Check-in – Check-out"
                className="mt-2"
              />
            )}
          </fieldset>

          {/* Preferences */}
          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-night mb-2">Trip preferences</legend>
            <label htmlFor={prefsId} className="sr-only">Trip preferences</label>
            <textarea
              id={prefsId}
              value={preferences}
              onChange={(e) => setPreferences(e.target.value.slice(0, MAX_PREFS))}
              placeholder="Travel companions, budget, must-dos, dietary needs, pace, or notes for the trip."
              rows={3}
              className="w-full bg-gray-50 border border-gray-300 rounded-baha-md px-3 py-2.5 text-sm text-night placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-600 focus:bg-white leading-relaxed"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{preferences.length}/{MAX_PREFS} characters</p>
          </fieldset>

          {error && (
            <div
              role="alert"
              className="mt-3 bg-coral-50 border border-coral-200 text-coral-700 text-sm rounded-baha-md px-3 py-2"
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3 font-extrabold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? (
              <>
                <span className="inline-flex gap-1 items-center" aria-hidden="true">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-buddy-think motion-reduce:animate-none" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-buddy-think motion-reduce:animate-none" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-buddy-think motion-reduce:animate-none" style={{ animationDelay: '300ms' }} />
                </span>
                Creating your trip...
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                Create trip
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            You can ask Buddy for help after the trip record is ready.
          </p>
        </div>
      </div>
    </div>
  )
}
