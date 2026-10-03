'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import {
  TRIP_STYLES_CHANGE_EVENT,
  TRIP_STYLES_STORAGE_KEY,
  parseTripStyles,
  readStoredTripStyles,
  sameTripStyles,
  writeStoredTripStyles,
  type TripStyle,
} from '@/lib/trip-styles'

type BrowserSupabase = ReturnType<typeof createClient>

function browserSupabase(): BrowserSupabase | null {
  // No public Supabase config (tests, previews): personalization stays local.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null
  try {
    return createClient()
  } catch {
    return null
  }
}

async function signedInUserId(supabase: BrowserSupabase): Promise<string | null> {
  try {
    // Local session read (no network); RLS still checks the JWT on every query.
    const { data } = await supabase.auth.getSession()
    return data.session?.user?.id ?? null
  } catch {
    return null
  }
}

/** Saves the choice on the traveller's own profile row (RLS: id = auth.uid()). */
async function saveProfileTripStyles(styles: readonly TripStyle[]): Promise<void> {
  const supabase = browserSupabase()
  if (!supabase) return
  const userId = await signedInUserId(supabase)
  if (!userId) return
  try {
    await supabase.from('users').update({ trip_styles: [...styles] }).eq('id', userId)
  } catch {
    // Best effort: the local choice already applies.
  }
}

async function loadProfileTripStyles(): Promise<TripStyle[] | null> {
  const supabase = browserSupabase()
  if (!supabase) return null
  const userId = await signedInUserId(supabase)
  if (!userId) return null
  try {
    const { data } = await supabase
      .from('users')
      .select('trip_styles')
      .eq('id', userId)
      .maybeSingle()
    return parseTripStyles((data as { trip_styles?: unknown } | null)?.trip_styles)
  } catch {
    return null
  }
}

/**
 * The visitor's chosen trip styles. Starts empty on the server and on the
 * first client render (identical, cacheable HTML), then reads localStorage
 * after mount. With `syncProfile`, a signed-in traveller with no local choice
 * adopts `users.trip_styles`, and every change is written back to that row.
 */
export function useTripStyles(options: { syncProfile?: boolean } = {}) {
  const { syncProfile = false } = options
  const [styles, setStylesState] = useState<TripStyle[]>([])
  const [ready, setReady] = useState(false)
  const stylesRef = useRef<TripStyle[]>([])

  const apply = useCallback((next: TripStyle[]) => {
    if (sameTripStyles(stylesRef.current, next)) return
    stylesRef.current = next
    setStylesState(next)
  }, [])

  useEffect(() => {
    let active = true
    const stored = readStoredTripStyles()
    apply(stored)
    setReady(true)

    if (syncProfile && stored.length === 0) {
      void loadProfileTripStyles().then((profileStyles) => {
        // Ignore when unmounted or when the visitor already picked meanwhile.
        if (!active || !profileStyles?.length || stylesRef.current.length > 0) return
        writeStoredTripStyles(profileStyles)
        apply(profileStyles)
      })
    }

    const onChange = (event: Event) => {
      apply(parseTripStyles((event as CustomEvent<unknown>).detail))
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === TRIP_STYLES_STORAGE_KEY) apply(readStoredTripStyles())
    }
    window.addEventListener(TRIP_STYLES_CHANGE_EVENT, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      active = false
      window.removeEventListener(TRIP_STYLES_CHANGE_EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [apply, syncProfile])

  const setStyles = useCallback((value: readonly string[]) => {
    const next = parseTripStyles(value)
    apply(next)
    writeStoredTripStyles(next)
    if (syncProfile) void saveProfileTripStyles(next)
  }, [apply, syncProfile])

  const toggleStyle = useCallback((style: TripStyle) => {
    const current = stylesRef.current
    setStyles(current.includes(style) ? current.filter((value) => value !== style) : [...current, style])
  }, [setStyles])

  return { styles, ready, setStyles, toggleStyle }
}
