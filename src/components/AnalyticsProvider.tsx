'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { init, isAnalyticsEnabled, pageview, resetIfIdentified } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'

export default function AnalyticsProvider() {
  const pathname = usePathname()
  const prevPath = useRef<string | null>(null)

  useEffect(() => {
    init()
    if (!isAnalyticsEnabled()) return

    // Sessions can end without the Sign out button (expiry, another tab,
    // refresh-token failure). Clear the Mixpanel/PostHog identity whenever Supabase
    // reports SIGNED_OUT so the next person on this device is not merged
    // into the previous user's profile.
    let unsubscribe: (() => void) | undefined
    try {
      const supabase = createClient()
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') resetIfIdentified()
      })
      unsubscribe = () => data.subscription.unsubscribe()
    } catch {
      // Supabase env missing (e.g. tests) — analytics still works without it.
    }
    return () => unsubscribe?.()
  }, [])

  useEffect(() => {
    if (pathname && pathname !== prevPath.current) {
      // pageview() sends the route template only (share codes, trip ids and
      // order ids are bearer tokens or record ids): `page_viewed` to Mixpanel
      // and a URL-scrubbed `$pageview` to PostHog.
      pageview(pathname)
      prevPath.current = pathname
    }
  }, [pathname])

  return null
}
