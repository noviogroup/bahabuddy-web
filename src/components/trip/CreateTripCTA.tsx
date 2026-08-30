'use client'

/**
 * CreateTripCTA — dashboard surface for opening <CreateTripModal>.
 *
 * Placement (in dashboard/page.tsx):
 *
 *   GreetingStrip
 *   IslandExplorerRow
 *   CreateTripCTA       ← here, primary action for new users
 *   AdaptiveHeroCard    ← secondary, still useful as inspiration
 *   HeroSearchPanel     ← direct stays/flights/explore/trip search
 *   …
 *
 * Imagery: full-width Bahamas photo background with gold/coral accent.
 * Real photo, not gradient — per the imagery-first principle. The
 * background is slightly desaturated and overlaid with a brand gradient
 * so the white text is legible at any image variance.
 *
 * Copy adapts to trip count:
 *   - 0 trips:    "Plan your Bahamas trip" / "Choose an island and create the trip record."
 *   - 1+ trips:   "Plan another trip" / "New island, new plan."
 *
 * This component is a thin client wrapper — modal lives on a sibling
 * element so it can render via a portal. State stays local.
 */

import { useState } from 'react'
import Image from 'next/image'
import CreateTripModal from './CreateTripModal'
import { BahaImages } from '@/lib/baha-images'

interface CreateTripCTAProps {
  /** How many trips the user currently has. Drives copy. */
  tripCount: number
}

export default function CreateTripCTA({ tripCount }: CreateTripCTAProps) {
  const [open, setOpen] = useState(false)

  const isFirstTrip = tripCount === 0
  const title = isFirstTrip ? 'Plan your Bahamas trip' : 'Plan another trip'
  const subtitle = isFirstTrip
    ? 'Choose an island and create the trip record first.'
    : 'New island, new plan. Buddy keeps your existing trips safe.'
  const cta = isFirstTrip ? 'Start a trip' : 'New trip'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative w-full rounded-baha-lg overflow-hidden shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        aria-haspopup="dialog"
      >
        {/* Real photo background — Exumas turquoise water carries the
            premium-Bahamas signal without text-illegibility issues. */}
        <div className="relative h-36 sm:h-40">
          <Image
            src={BahaImages.exumas}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
          {/* Brand gradient overlay — left-to-right brand→transparent
              so the imagery breathes on the right while text stays legible. */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-700/85 via-brand-600/55 to-brand-500/15" aria-hidden="true" />

          <div className="absolute inset-0 flex items-center justify-between gap-4 px-5 sm:px-6">
            <div className="text-left min-w-0">
              <p className="text-white/85 text-xs font-bold uppercasest">
                {isFirstTrip ? 'Start here' : 'Ready for the next one?'}
              </p>
              <h2 className="text-white text-xl font-bold leading-tight mt-1 drop-shadow">
                {title}
              </h2>
              <p className="text-white/85 text-xs mt-1 leading-snug max-w-xs">
                {subtitle}
              </p>
            </div>

            {/* Action pill — white on brand, the strongest CTA on the page */}
            <span className="shrink-0 inline-flex items-center gap-1.5 bg-white text-brand-700 group-hover:bg-brand-50 text-sm font-bold px-4 py-2.5 rounded-full transition-colors shadow">
              {cta}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </div>
        </div>
      </button>

      <CreateTripModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
