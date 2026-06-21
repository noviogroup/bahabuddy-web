'use client'

/**
 * HotelCard — information-dense, decision-supporting card for a single hotel.
 *
 * This is the FIRST card in the new reusable card system. Treat it as the
 * reference implementation for the other card types (Restaurant, Activity,
 * Destination, etc.) — same shape, same atoms, same behaviors.
 *
 * Three sizes (one component, three behaviors):
 *
 *   - 'compact'  : Default for chat. Wraps an expandable button-shell. The
 *                  user taps anywhere on the card body to reveal a gallery
 *                  strip, the full amenities list, an action row (Call /
 *                  Website / Directions / Add to trip), the full review text,
 *                  and a detail link that goes to /stays/[id].
 *
 *   - 'default'  : For list pages (/stays). Whole card is a Link to the
 *                  detail page. No expand state — the destination IS the
 *                  detail page.
 *
 *   - 'detail'   : For embedding inside the detail page itself. No link,
 *                  always-expanded layout. Used in trip summaries and the
 *                  /stays/[id] header.
 *
 * Decision-supporting elements (above the fold, always visible):
 *   - Hero photo with rating chip + photo count
 *   - Name + chain + island
 *   - Top 3 amenities, first one promoted ("Beachfront") if it's a key
 *     differentiator from `vibe_tags` (extensibility hook for later)
 *   - Per-night price + full-stay total preview when nights are known
 *   - One review snippet as social proof
 *   - Primary CTA chevron / "Tap for more"
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  CardShell, Rating, PriceTag, ChipRow, ReviewSnippet, PhotoStrip, ActionRow,
} from './shared'
import type { Action } from './shared'

// ─── Types ────────────────────────────────────────────────────────────────

/**
 * HotelCardData — the data shape a HotelCard needs to render.
 *
 * Optional fields gracefully degrade: missing `top_review` skips the
 * social-proof block, missing `phone` hides the Call action, etc.
 * The card never crashes for missing data — the worst case is just
 * less density.
 */
export interface HotelCardData {
  place_id?: string
  name: string
  island?: string
  island_id?: string
  rating?: number
  review_count?: number
  /** Star tier (1-5) derived from price_level. Distinct from `rating`. */
  stars?: number
  /** Primary hero photo. Falls back to photos[0]. */
  photo_url?: string
  /** Full photo gallery (jsonb array from google_places). */
  photos?: string[]
  amenities?: string[]
  /** Highlight first chip ("Beachfront", "Adults-only", etc.). */
  featured_amenity?: string
  price_per_night?: number
  price_is_estimate?: boolean
  /** Trip nights for full-stay total preview. */
  nights?: number
  /** Contact + location enrichments. */
  phone?: string
  website?: string
  full_address?: string
  /** One short review snippet for social proof. */
  top_review?: {
    text: string
    author_name: string
    rating: number
    time: string
  }
}

interface Props {
  data: HotelCardData
  size?: 'compact' | 'default' | 'detail'
  /** Called when the user taps Add to trip. Caller owns auth/trip context. */
  onSave?: (data: HotelCardData) => void
  className?: string
}

// ─── Icon primitives (small inline SVGs, no font icon dependency) ─────────

const I = {
  phone: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  globe: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>
    </svg>
  ),
  mapPin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  heart: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  arrowRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
}

// ─── Component ────────────────────────────────────────────────────────────

export function HotelCard({ data, size = 'compact', onSave, className }: Props) {
  const [expanded, setExpanded] = useState(size === 'detail')

  const {
    place_id, name, island, rating, review_count, stars,
    photo_url, photos = [], amenities = [], featured_amenity,
    price_per_night = 0, price_is_estimate, nights,
    phone, website, full_address, top_review,
  } = data

  const detailHref = place_id ? `/stays/${encodeURIComponent(place_id)}` : null

  // Build the amenity chip list. Featured amenity comes first if provided,
  // otherwise fall back to the first amenity from the array.
  const allAmenities = amenities.slice()
  const featured = featured_amenity ?? null
  if (featured && !allAmenities.includes(featured)) allAmenities.unshift(featured)
  const collapsedMax = 3
  const visibleAmenities = expanded ? allAmenities : allAmenities.slice(0, collapsedMax)

  // Action row for expanded state
  const actions: Action[] = []
  if (phone) actions.push({
    label: 'Call', icon: I.phone, href: `tel:${phone.replace(/[^+\d]/g, '')}`, iconOnly: true,
  })
  if (website) actions.push({
    label: 'Website', icon: I.globe, href: website, external: true, iconOnly: true,
  })
  if (full_address) actions.push({
    label: 'Directions',
    icon: I.mapPin,
    href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(full_address)}`,
    external: true,
    iconOnly: true,
  })
  if (onSave) actions.push({
    label: 'Add to trip', icon: I.heart, onClick: () => onSave(data), iconOnly: false, tone: 'coral',
  })

  // ─── Card body content (shared between sizes) ──────────────────────────

  const ratingOverlay = (rating ?? 0) > 0 ? (
    <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md px-1.5 py-0.5 shadow-sm">
      <Rating rating={rating} count={review_count} size="sm" showCount />
    </span>
  ) : null

  const starsRow = stars && stars > 0 ? (
    <span className="text-charcoal text-xs font-extrabold leading-none">
      {stars}-star hotel
    </span>
  ) : null

  const body = (
    <>
      <PhotoStrip
        photos={photos}
        hero={photo_url}
        expanded={expanded}
        variant="hotel"
        alt={`Photo of ${name}`}
        overlay={{
          topLeft: ratingOverlay ?? undefined,
        }}
      />

      <div className="p-3 space-y-2.5">
        {/* Identity */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-gray-900 leading-tight truncate">{name}</p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
              <span className="text-gray-400">{I.mapPin}</span>
              <span className="truncate">{island ?? full_address ?? 'The Bahamas'}</span>
              {starsRow && <span aria-hidden="true" className="text-gray-300">·</span>}
              {starsRow}
            </p>
          </div>
          <PriceTag
            amount={price_per_night}
            variant="per_night"
            nights={nights}
            isEstimate={price_is_estimate}
            size="md"
            align="right"
          />
        </div>

        {/* Amenities */}
        {allAmenities.length > 0 && (
          <ChipRow
            chips={visibleAmenities}
            max={expanded ? undefined : collapsedMax}
            featuredFirst={!!featured}
          />
        )}

        {/* Review snippet — social proof */}
        {top_review && (
          <ReviewSnippet
            text={top_review.text}
            author={top_review.author_name}
            rating={top_review.rating}
            when={top_review.time}
            clamp={expanded ? 4 : 2}
            variant="callout"
          />
        )}

        {!expanded && size === 'compact' && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400">
              Tap for photos &amp; reviews {I.chevron}
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              {detailHref && (
                <Link
                  href={detailHref}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex h-8 items-center rounded-full border border-gray-300 bg-white px-3 text-[11px] font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                >
                  View stay
                </Link>
              )}
              {onSave && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSave(data)
                  }}
                  className="inline-flex h-8 items-center rounded-full bg-brand-600 px-3 text-[11px] font-extrabold text-white shadow-sm transition-colors hover:bg-brand-700"
                >
                  Add to trip
                </button>
              )}
            </div>
          </div>
        )}

        {/* Expanded-only block: full address + actions + detail link */}
        {expanded && (
          <div className="space-y-2.5 pt-1">
            {full_address && (
              <p className="text-xs text-gray-500 leading-snug flex items-start gap-1.5">
                <span className="text-gray-400 mt-0.5">{I.mapPin}</span>
                <span>{full_address}</span>
              </p>
            )}

            {actions.length > 0 && <ActionRow actions={actions} align="left" />}

            {detailHref && size === 'compact' && (
              <Link
                href={detailHref}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-night hover:text-gray-700"
              >
                View full details {I.arrowRight}
              </Link>
            )}
          </div>
        )}

      </div>
    </>
  )

  // ─── Shell selection by size ──────────────────────────────────────────

  if (size === 'compact') {
    return (
      <CardShell
        mode="expandable"
        onClick={() => setExpanded(v => !v)}
        expanded={expanded}
        ariaLabel={expanded ? `Collapse ${name}` : `Expand ${name} for more info`}
        className={className}
      >
        {body}
      </CardShell>
    )
  }

  if (size === 'default' && detailHref) {
    return (
      <CardShell mode="link" href={detailHref} ariaLabel={`View details for ${name}`} className={className} trackCardType="hotel" trackCardId={place_id ?? undefined}>
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
