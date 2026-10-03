'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { getOwnedTourSources, tourOwnershipLabel } from '@/lib/self-guided-tours'
import { createClient } from '@/lib/supabase/client'

/** tour_id → entitlement source ('stripe', 'free', …). */
const OwnedToursContext = createContext<ReadonlyMap<string, string | null>>(new Map())

/** Loads the signed-in traveler's tour entitlements once for a catalog page. */
export function OwnedToursProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [owned, setOwned] = useState<ReadonlyMap<string, string | null>>(() => new Map())

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return
      const sources = await getOwnedTourSources(supabase)
      if (active) setOwned(sources)
    }).catch(() => undefined)
    return () => {
      active = false
    }
  }, [supabase])

  return <OwnedToursContext.Provider value={owned}>{children}</OwnedToursContext.Provider>
}

/** Price label that flips to "Purchased" / "In My tours" once the entitlement is known. */
export function TourPriceBadge({ tourId, priceLabel, priceCents = 0 }: { tourId: string; priceLabel: string; priceCents?: number }) {
  const owned = useContext(OwnedToursContext)
  return owned.has(tourId) ? (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
      {tourOwnershipLabel({ source: owned.get(tourId), priceCents })}
    </span>
  ) : (
    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-night shadow-sm">{priceLabel}</span>
  )
}
