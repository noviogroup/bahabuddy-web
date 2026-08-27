'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  dismissTravelOriginPrompt,
  hasDismissedTravelOriginPrompt,
  readStoredTravelOrigin,
  saveTravelOrigin,
} from '@/lib/travel-origin'
import TravelSearchCombobox from '@/components/marketplace/TravelSearchCombobox'
import { ORIGIN_AIRPORT_OPTIONS } from '@/lib/airports'
import { track } from '@/lib/analytics'

const HIDDEN_PREFIXES = [
  '/dashboard',
  '/profile',
  '/trip',
  '/login',
  '/search',
  '/share',
  '/explore/island',
  '/stays',
  '/api',
]

const HIDDEN_PATTERNS = [
  /^\/flights\/.+\/book(?:\/)?$/,
  /^\/flights\/.+\/confirmation(?:\/)?$/,
  /^\/stays\/[^/]+\/guests(?:\/)?$/,
  /^\/stays\/[^/]+\/checkout(?:\/)?$/,
  /^\/stays\/[^/]+\/confirmation(?:\/)?$/,
  /^\/concierge-trip-plan\/checkout(?:\/)?$/,
]

function shouldHideOriginPrompt(pathname: string): boolean {
  return HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    HIDDEN_PATTERNS.some((pattern) => pattern.test(pathname))
}

export default function TravelOriginPrompt() {
  const pathname = usePathname()
  const [origin, setOrigin] = useState('')
  const [visible, setVisible] = useState(false)
  const [externalPickerOpen, setExternalPickerOpen] = useState(false)
  const [confirmationOrigin, setConfirmationOrigin] = useState<string | null>(null)
  const promptRef = useRef<HTMLElement | null>(null)
  const promptShownRef = useRef(false)

  useEffect(() => {
    if (!pathname) return
    if (shouldHideOriginPrompt(pathname)) return

    const stored = readStoredTravelOrigin()
    if (stored?.origin) {
      setVisible(false)
      return
    }

    if (hasDismissedTravelOriginPrompt()) return
    const timeout = window.setTimeout(() => {
      setVisible(true)
      if (!promptShownRef.current) {
        promptShownRef.current = true
        track('travel_origin_prompt_shown', { path: pathname })
      }
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [pathname])

  function handleDismiss() {
    dismissTravelOriginPrompt()
    track('travel_origin_prompt_dismissed', { path: pathname })
    setVisible(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const saved = saveTravelOrigin(origin)
    if (!saved) return
    track('travel_origin_saved', {
      path: pathname,
      origin: saved.origin,
      source: 'public_prompt',
    })
    setConfirmationOrigin(saved.origin)
    setVisible(false)
  }

  useEffect(() => {
    if (!confirmationOrigin) return
    const timeout = window.setTimeout(() => setConfirmationOrigin(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [confirmationOrigin])

  useEffect(() => {
    if (!visible) {
      setExternalPickerOpen(false)
      return
    }

    function updateExternalPickerState() {
      window.requestAnimationFrame(() => {
        const expandedPicker = document.querySelector<HTMLElement>(
          '[role="combobox"][aria-expanded="true"], [aria-haspopup="listbox"][aria-expanded="true"]',
        )
        setExternalPickerOpen(Boolean(
          expandedPicker && !promptRef.current?.contains(expandedPicker),
        ))
      })
    }

    document.addEventListener('focusin', updateExternalPickerState)
    document.addEventListener('mousedown', updateExternalPickerState)
    document.addEventListener('keydown', updateExternalPickerState)
    updateExternalPickerState()

    return () => {
      document.removeEventListener('focusin', updateExternalPickerState)
      document.removeEventListener('mousedown', updateExternalPickerState)
      document.removeEventListener('keydown', updateExternalPickerState)
    }
  }, [visible])

  if (!pathname || shouldHideOriginPrompt(pathname)) return null

  if (confirmationOrigin) {
    return (
      <div className="fixed bottom-4 left-4 z-50 hidden max-w-xs rounded-2xl border border-gray-200 bg-white/95 px-4 py-3 text-xs font-semibold text-night shadow-sm backdrop-blur md:block">
        Flights will preview from {confirmationOrigin}.
      </div>
    )
  }

  if (!visible || externalPickerOpen) return null

  return (
    <aside
      ref={promptRef}
      aria-label="Travel origin prompt"
      className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur md:bottom-5 md:left-5 md:right-auto md:max-w-sm"
    >
      <form onSubmit={handleSubmit} className="grid gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">
            Personalize fares
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-night">
            Where are you travelling from?
          </h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
            Baha Buddy will update flight previews around your home airport.
          </p>
        </div>
        <div>
          <label htmlFor="travel-origin-prompt" className="sr-only">
            Travelling from
          </label>
          <TravelSearchCombobox
            id="travel-origin-prompt"
            name="travel-origin-prompt"
            value={origin}
            onChange={setOrigin}
            options={ORIGIN_AIRPORT_OPTIONS}
            ariaLabel="Travelling from"
            allowCustomValue
            placeholder="Miami, Atlanta, Toronto"
            emptyLabel="Type a city, airport, or 3-letter code"
            helperText="Search by city, airport, or code"
            customOptionLabel={(query) => `Use "${query}" as departure city`}
            className="h-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
            Use origin
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex h-10 items-center justify-center rounded-full border border-gray-300 bg-white px-4 text-sm font-semibold text-night transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
          >
            Not now
          </button>
        </div>
      </form>
    </aside>
  )
}
