'use client'

/**
 * DestinationCard — island-level "should I go here" callout.
 *
 * Phase 4 redesign vs the old inline version:
 *
 *   - Best-months calendar bar. A horizontal 12-month strip where each
 *     month is a small segment — peak months filled brand-tone, the
 *     hurricane window (Aug \u2013 Oct) tinted coral as a warning, and
 *     off-season muted grey. This is the single most decision-supporting
 *     piece of info for "when should I go to X?" \u2014 and our advantage
 *     over a generic Wikipedia-style island page that doesn't have any
 *     opinion about when to visit.
 *
 *   - Getting-there line. Most Out Islands require a Bahamasair domestic
 *     hop from Nassau (NAS) \u2014 surfacing that on the card stops the user
 *     from assuming they can fly direct from MIA.
 *
 *   - Days-recommended chip. Quick scan signal: "3 \u2013 5 days" tells the
 *     planner what kind of trip shape this island supports.
 *
 *   - Highlights as colored chips (ChipRow). Same visual language as the
 *     ActivityCard vibe chips for consistency.
 *
 *   - Link still goes to /explore/island/[slug] \u2014 the marketing surface
 *     for SEO. island_id is preferred when threaded through; falls back
 *     to inferring from `name` via the local slug map.
 */

import { CardShell, ChipRow, Rating } from './shared'
import type { Chip } from './shared'

// \u2500\u2500\u2500 Types \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export interface DestinationCardData {
  name: string
  /** Canonical island slug. When set, the card links to /explore/island/[island_id]. */
  island_id?: string
  /** Hero photo URL. */
  photo_url?: string
  /** Short hook line under the name. */
  tagline?: string
  /** One-line "how to actually get there" guidance. */
  getting_there?: string
  /** Free-form recommended trip length ("3 \u2013 5 days"). */
  days_recommended?: string
  /**
   * Months when the island is at its best. 3-letter lowercase codes
   * (e.g. ["dec","jan","feb","mar","apr"]). When absent, falls back to
   * the Bahamas peak default (Dec \u2013 Apr).
   */
  best_months?: string[]
  highlights?: string[]
  rating?: number
  /** "From $X" footer pricing. */
  price_from?: number
}

interface Props {
  data: DestinationCardData
  className?: string
}

// \u2500\u2500\u2500 Slug normalizer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/** Match the slug system in `src/lib/island-config.ts`. Kept local to
 *  this card so DestinationCard remains self-contained. */
function islandNameToSlug(name: string): string | null {
  const KNOWN: Record<string, string> = {
    'nassau': 'nassau-paradise-island',
    'nassau & paradise island': 'nassau-paradise-island',
    'paradise island': 'paradise-island',
    'exuma': 'the-exumas',
    'exumas': 'the-exumas',
    'the exumas': 'the-exumas',
    'eleuthera': 'eleuthera-harbour-island',
    'harbour island': 'harbour-island',
    'briland': 'harbour-island',
    'andros': 'andros',
    'grand bahama': 'grand-bahama',
    'bimini': 'bimini',
    'long island': 'long-island',
    'abacos': 'abacos',
    'the abacos': 'abacos',
  }
  return KNOWN[name.trim().toLowerCase()] ?? null
}

// \u2500\u2500\u2500 Best-months sub-component \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const
const HURRICANE_MONTHS = new Set(['aug', 'sep', 'oct'])
/** Bahamas-wide peak default \u2014 used when an island doesn't declare
 *  its own best_months. Dry season, cooler temps, low hurricane risk. */
const BAHAMAS_DEFAULT_BEST = new Set(['dec', 'jan', 'feb', 'mar', 'apr'])

/**
 * 12-segment month strip. Visually communicates the season at a glance.
 *
 * Three tonal states:
 *   - peak     (in best_months)         \u2192 brand-500 fill
 *   - hurricane (Aug/Sep/Oct, not in peak) \u2192 coral-200 fill (warning)
 *   - off-season                         \u2192 sand-200 fill (muted)
 *
 * Reads month codes as 3-letter lowercase; tolerates leading uppercase
 * ("Dec") and other casings just in case Claude varies emission.
 */
function BestMonthsBar({ best }: { best?: string[] }) {
  const peakSet = (best && best.length > 0)
    ? new Set(best.map(m => m.slice(0, 3).toLowerCase()))
    : BAHAMAS_DEFAULT_BEST

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Best time to visit</p>
      <div className="flex gap-0.5" role="img" aria-label="Best months to visit">
        {MONTHS.map((m, i) => {
          const isPeak = peakSet.has(m)
          const isHurricane = !isPeak && HURRICANE_MONTHS.has(m)
          const bg = isPeak
            ? 'bg-brand-500'
            : isHurricane
              ? 'bg-coral-200'
              : 'bg-sand-200'
          return (
            <div key={m} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`h-2 w-full rounded-sm ${bg}`} title={m.toUpperCase()} />
              <span className={`text-[8px] font-semibold uppercase ${isPeak ? 'text-brand-700' : 'text-gray-400'}`}>
                {m.charAt(0)}
              </span>
              {/* Hide the J/F/J double-J ambiguity \u2014 the bar itself communicates,
                  and the letter row is decoration. Sticking with single-letter
                  is intentional: brevity over disambiguation at this size. */}
              <span className="sr-only">{m} {i + 1}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// \u2500\u2500\u2500 Component \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const I = {
  plane: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  ),
  clock: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
}

export function DestinationCard({ data, className }: Props) {
  const {
    name, island_id, photo_url, tagline,
    getting_there, days_recommended, best_months,
    highlights = [], rating, price_from = 0,
  } = data

  const slug = island_id ?? islandNameToSlug(name)
  const href = slug ? `/explore/island/${slug}` : null

  const chips: Chip[] = highlights.slice(0, 5).map(h => ({ label: h, tone: 'brand' as const }))

  const body = (
    <>
      {/* Hero \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <div className="relative h-32">
        {photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-500 to-brand-600" aria-hidden="true" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" aria-hidden="true" />

        {(rating ?? 0) > 0 && (
          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-md px-1.5 py-0.5 shadow-sm">
            <Rating rating={rating} size="sm" showCount={false} />
          </div>
        )}

        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-white text-xl font-extrabold drop-shadow leading-tight">{name}</p>
          {tagline && (
            <p className="text-white/90 text-xs italic mt-0.5 drop-shadow line-clamp-1">{tagline}</p>
          )}
        </div>
      </div>

      {/* Body \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <div className="p-3 space-y-2.5">
        {/* Best-months bar */}
        <BestMonthsBar best={best_months} />

        {/* Highlights */}
        {chips.length > 0 && (
          <ChipRow chips={chips} max={5} />
        )}

        {/* Getting there + days recommended row */}
        {(getting_there || days_recommended) && (
          <div className="flex items-center justify-between gap-3 text-[11px] pt-1">
            {getting_there && (
              <span className="inline-flex items-center gap-1.5 text-gray-600 min-w-0">
                <span className="text-brand-600 shrink-0">{I.plane}</span>
                <span className="truncate">{getting_there}</span>
              </span>
            )}
            {days_recommended && (
              <span className="inline-flex items-center gap-1 text-gray-600 shrink-0">
                <span className="text-gray-400">{I.clock}</span>
                <span className="font-semibold">{days_recommended}</span>
              </span>
            )}
          </div>
        )}

        {/* Footer: price-from */}
        {price_from > 0 && (
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">From</span>
            <span className="text-brand-600 font-bold text-base">${Math.round(price_from).toLocaleString()}</span>
          </div>
        )}
      </div>
    </>
  )

  if (href) {
    return (
      <CardShell mode="link" href={href} ariaLabel={`Read about ${name}`} className={className}>
        {body}
      </CardShell>
    )
  }

  return (
    <CardShell mode="plain" className={className}>
      {body}
    </CardShell>
  )
}
