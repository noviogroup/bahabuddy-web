'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { getOwnedTourIds } from '@/lib/self-guided-tours'
import { createClient } from '@/lib/supabase/client'

const OwnedToursContext = createContext<ReadonlySet<string>>(new Set())

/** Loads the signed-in traveler's tour entitlements once for a catalog page. */
export function OwnedToursProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [owned, setOwned] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return
      const ids = await getOwnedTourIds(supabase)
      if (active) setOwned(new Set(ids))
    }).catch(() => undefined)
    return () => {
      active = false
    }
  }, [supabase])

  return <OwnedToursContext.Provider value={owned}>{children}</OwnedToursContext.Provider>
}

/** Price label that flips to "Owned" once the entitlement is known. */
export function TourPriceBadge({ tourId, priceLabel }: { tourId: string; priceLabel: string }) {
  const owned = useContext(OwnedToursContext).has(tourId)
  return owned ? (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">Owned</span>
  ) : (
    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-night shadow-sm">{priceLabel}</span>
  )
}
